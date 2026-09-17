<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Makes a bearer token count on the routes that do not require one.
 *
 * Searching and reading a listing are public: no `auth:sanctum` middleware, so
 * Laravel resolves `$request->user()` against the default guard and a token in
 * the header is simply not looked at. Everything that depends on who is asking
 * — blocking, above all — then silently does nothing for exactly the requests
 * that look most like they work.
 *
 * Sanctum caches the user it resolves, so the guard below costs one query per
 * request at most, and none at all for a caller who sent no token.
 */
class ResolveOptionalUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken() !== null) {
            $user = auth('sanctum')->user();

            if ($user !== null) {
                // Both the request helper and every Gate check read this.
                auth()->setUser($user);
            }
        }

        return $next($request);
    }
}
