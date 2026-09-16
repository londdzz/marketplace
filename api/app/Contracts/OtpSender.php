<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Exceptions\OtpDeliveryException;

/**
 * Delivers a one-time code to a phone number.
 *
 * Implementations are interchangeable: WhatsApp today, an SMS or Viber channel
 * alongside it later, without the OTP logic changing.
 */
interface OtpSender
{
    /**
     * @param  string  $phone  E.164, including the leading plus
     * @param  string  $code  the plain code, which is never persisted anywhere
     * @param  string  $locale  the recipient's language, for the message template
     *
     * @throws OtpDeliveryException when the code could not be delivered
     */
    public function send(string $phone, string $code, string $locale): void;
}
