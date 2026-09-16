<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * The webhook carries no session and no token, so the shared secret configured
 * in the RevenueCat dashboard is what proves the caller is RevenueCat.
 *
 * It fails closed: with no secret configured, nothing is accepted. A webhook
 * that trusts anyone is a way to mint credits for free.
 */
class VerifyRevenueCatWebhook
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('credits.webhook.secret');

        if ($expected === '') {
            Log::error('A RevenueCat webhook arrived while no shared secret is configured.');

            throw new AccessDeniedHttpException;
        }

        $provided = (string) $request->header('Authorization', '');

        // Compared in constant time so the secret cannot be guessed a character
        // at a time.
        if (! hash_equals($expected, $provided)) {
            Log::warning('A RevenueCat webhook failed verification.', ['ip' => $request->ip()]);

            throw new AccessDeniedHttpException;
        }

        return $next($request);
    }
}
