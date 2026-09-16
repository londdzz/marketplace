<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * The transition asked for does not apply to the state the listing is in, such
 * as publishing one that is already live or renewing one that was never
 * published.
 */
final class ListingStatusException extends HttpException
{
    public function __construct(string $translationKey)
    {
        parent::__construct(422, (string) __($translationKey));
    }
}
