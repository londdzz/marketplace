<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureUserIsNotBlocked;
use App\Http\Middleware\ResolveOptionalUser;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\VerifyRevenueCatWebhook;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Behind a reverse proxy — Cloudflare Tunnel in testing, nginx in
        // production — every request reaches PHP from the loopback, and the
        // caller's own address is in X-Forwarded-For. Untrusted, that header
        // is ignored and $request->ip() answers 127.0.0.1 for everybody: one
        // rate-limit bucket for the whole internet, and ten OTP requests an
        // hour shared between every person trying to sign in.
        //
        // Only the loopback is trusted by default, so the header counts when
        // the proxy is on this machine and is ignored when a phone on the wifi
        // talks to `artisan serve` directly. TRUSTED_PROXIES widens it for a
        // proxy that is somewhere else; trusting an address that can be
        // reached from outside would let a caller name any address it liked.
        $middleware->trustProxies(
            at: array_filter(array_map(
                trim(...),
                explode(',', (string) env('TRUSTED_PROXIES', '127.0.0.1,::1')),
            )),
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
        );

        $middleware->api(prepend: [
            // Before SetLocale, which also wants to know whose language to
            // answer in, and before the throttle, which counts a request
            // against the account rather than the address when there is one.
            ResolveOptionalUser::class,
            SetLocale::class,
            // Laravel 11 throttles nothing by default. Prepended rather than
            // appended so a flood is turned away before route model binding
            // has gone to the database on its behalf.
            'throttle:api',
        ]);

        $middleware->alias([
            'blocked' => EnsureUserIsNotBlocked::class,
            'revenuecat' => VerifyRevenueCatWebhook::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Framework messages are English literals, so they are replaced with
        // translation keys like every other user-facing string.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => __('auth.unauthenticated')], 401);
            }

            return null;
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => __('errors.rate_limited')], 429, $e->getHeaders());
            }

            return null;
        });
    })->create();
