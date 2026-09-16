<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Thrown when a spend is attempted against a balance that cannot cover it.
 *
 * Rendered as HTTP 402 Payment Required, which is what the app listens for in
 * order to open the credit packs sheet.
 */
final class InsufficientCreditsException extends HttpException
{
    public function __construct(
        public readonly int $required,
        public readonly int $available,
    ) {
        parent::__construct(402, (string) __('credits.insufficient'));
    }
}
