<?php

declare(strict_types=1);

namespace App\Support\Otp;

use App\Contracts\OtpSender;
use App\Exceptions\OtpDeliveryException;
use App\Support\PhoneNumber;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends the code through Messaggio, over whichever channels are configured.
 *
 * One request reaches several networks: `channels` is a preference order and
 * Messaggio falls through it, so "viber,sms" tries Viber and sends an SMS only
 * to the people it could not reach. Viber is about a third the price of an SMS
 * in the region, so the order is money.
 *
 * Unlike the WhatsApp Cloud API there is no template to get approved — the
 * text is ours, translated, and `auth.otp.message` is deliberately short
 * enough to fit one SMS segment in every language. See SmsLength and the test
 * beside it: a segment is 70 characters once the text is Cyrillic, not 160,
 * and going one over doubles the price of every sign-in.
 */
final class MessaggioOtpSender implements OtpSender
{
    public function send(string $phone, string $code, string $locale): void
    {
        $config = config('otp.messaggio');

        $login = $config['login'] ?? null;
        $channels = $config['channels'] ?? [];

        if (blank($login) || $channels === []) {
            Log::error('Messaggio OTP delivery is not configured.');

            throw new OtpDeliveryException;
        }

        $text = trans('auth.otp.message', [
            'code' => $code,
            'minutes' => (int) config('otp.ttl_minutes'),
        ], $locale);

        $payload = [
            // Messaggio's own examples carry the number without a leading plus.
            'recipients' => [['phone' => PhoneNumber::withoutPlus($phone)]],
            'channels' => array_values($channels),
            'options' => ['ttl' => (int) $config['ttl']],
        ];

        // Each channel carries its own copy of the message. They are identical
        // here — a sign-in code is the same sentence wherever it arrives.
        foreach ($channels as $channel) {
            $payload[$channel] = [
                'from' => $config['sender'],
                'content' => [['type' => 'text', 'text' => $text]],
            ];
        }

        try {
            $response = Http::withHeaders([(string) $config['auth_header'] => (string) $login])
                ->timeout((int) $config['timeout'])
                ->asJson()
                ->post(rtrim((string) $config['base_url'], '/').'/api/v1/send', $payload);
        } catch (ConnectionException $e) {
            Log::warning('Messaggio OTP delivery could not reach the API.', [
                'phone' => PhoneNumber::mask($phone),
            ]);

            throw new OtpDeliveryException($e);
        }

        if ($response->failed()) {
            Log::warning('Messaggio OTP delivery was rejected.', [
                'phone' => PhoneNumber::mask($phone),
                'status' => $response->status(),
            ]);

            throw new OtpDeliveryException;
        }

        $this->assertAccepted($response->json('messages'), $phone);
    }

    /**
     * Messaggio answers 200 and reports per-recipient failures inside the body:
     * a bad number comes back as an `error` object beside the recipient rather
     * than as a failed request. Trusting the status code alone would let every
     * undeliverable code look sent, and the person waiting for it would be
     * told it was on its way.
     *
     * @param  mixed  $messages
     */
    private function assertAccepted($messages, string $phone): void
    {
        if (! is_array($messages) || $messages === []) {
            Log::warning('Messaggio accepted the request but acknowledged no message.', [
                'phone' => PhoneNumber::mask($phone),
            ]);

            throw new OtpDeliveryException;
        }

        foreach ($messages as $message) {
            if (! is_array($message)) {
                continue;
            }

            if (isset($message['error'])) {
                Log::warning('Messaggio refused the recipient.', [
                    'phone' => PhoneNumber::mask($phone),
                    'error' => $message['error'],
                ]);

                throw new OtpDeliveryException;
            }

            if (blank($message['message_id'] ?? null)) {
                Log::warning('Messaggio returned no message id, so nothing was sent.', [
                    'phone' => PhoneNumber::mask($phone),
                ]);

                throw new OtpDeliveryException;
            }
        }
    }
}
