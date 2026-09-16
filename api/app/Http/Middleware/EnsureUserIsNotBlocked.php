<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\AccountBlockedException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A blocked account keeps its data but loses access to every authenticated
 * endpoint.
 */
class EnsureUserIsNotBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isBlocked() === true) {
            throw new AccountBlockedException;
        }

        return $next($request);
    }
}
