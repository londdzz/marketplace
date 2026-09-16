<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * The submitted code was wrong, already used, or past its expiry.
 *
 * All three cases deliberately look identical from outside, so the response
 * never reveals whether a code exists for a phone number.
 */
final class InvalidOtpException extends HttpException
{
    public function __construct()
    {
        parent::__construct(422, (string) __('auth.otp.invalid'));
    }
}
