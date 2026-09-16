<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * The code could not be handed to the delivery channel. The caller should try
 * again rather than sit waiting for a message that will never arrive.
 */
final class OtpDeliveryException extends HttpException
{
    public function __construct(?Throwable $previous = null)
    {
        parent::__construct(503, (string) __('auth.otp.delivery_failed'), $previous);
    }
}
