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
