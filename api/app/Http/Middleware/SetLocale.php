<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the language for the response.
 *
 * A signed-in user's saved preference wins, because it is the language they
 * chose in their profile and it should follow them onto any device. Failing
 * that the Accept-Language header decides, and failing that the application
 * default, Albanian.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->fromUser($request)
            ?? $this->fromHeader($request)
            ?? (string) config('app.locale');

        app()->setLocale($locale);

        return $next($request);
    }

    private function fromHeader(Request $request): ?string
    {
        $supported = (array) config('app.supported_locales');
        $header = $request->header('Accept-Language');

        if (! is_string($header) || $header === '') {
            return null;
        }

        foreach (explode(',', $header) as $part) {
            $tag = strtolower(trim(explode(';', $part)[0]));
            $primary = explode('-', $tag)[0];

            if (in_array($primary, $supported, true)) {
                return $primary;
            }
        }

        return null;
    }

    /**
     * Resolving the bearer token here means the preference applies from the
     * first middleware onwards, not only once the route guard has run. Sanctum
     * caches the resolved user, so the guard does not query twice.
     */
    private function fromUser(Request $request): ?string
    {
        if ($request->bearerToken() === null) {
            return null;
        }

        $language = auth('sanctum')->user()?->preferred_language;

        return in_array($language, (array) config('app.supported_locales'), true)
            ? $language
            : null;
    }
}
