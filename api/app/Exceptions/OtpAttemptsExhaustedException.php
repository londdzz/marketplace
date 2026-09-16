<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Too many wrong guesses against one code. The code is burned and the user has
 * to request a new one.
 */
final class OtpAttemptsExhaustedException extends HttpException
{
    public function __construct()
    {
        parent::__construct(429, (string) __('auth.otp.too_many_attempts'));
    }
}
