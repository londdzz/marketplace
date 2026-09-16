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
 * Sends the code as a WhatsApp authentication template through the Cloud API.
 *
 * The template must be approved by Meta in each language and must take exactly
 * one body parameter, the code. When it carries a copy-code button the same
 * value is repeated as the button parameter, which is what drives one-tap
 * autofill on iOS and Android.
 */
final class WhatsAppOtpSender implements OtpSender
{
    public function send(string $phone, string $code, string $locale): void
    {
        $config = config('otp.whatsapp');

        $phoneNumberId = $config['phone_number_id'] ?? null;
        $accessToken = $config['access_token'] ?? null;

        if (blank($phoneNumberId) || blank($accessToken)) {
            Log::error('WhatsApp OTP delivery is not configured.');

            throw new OtpDeliveryException;
        }

        $components = [[
            'type' => 'body',
            'parameters' => [['type' => 'text', 'text' => $code]],
        ]];

        if ($config['copy_code_button'] === true) {
            $components[] = [
                'type' => 'button',
                'sub_type' => 'url',
                'index' => '0',
                'parameters' => [['type' => 'text', 'text' => $code]],
            ];
        }

        $url = sprintf(
            '%s/%s/%s/messages',
            rtrim((string) $config['base_url'], '/'),
            $config['api_version'],
            $phoneNumberId,
        );

        try {
            $response = Http::withToken((string) $accessToken)
                ->timeout((int) $config['timeout'])
                ->asJson()
                ->post($url, [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => PhoneNumber::withoutPlus($phone),
                    'type' => 'template',
                    'template' => [
                        'name' => $config['template'],
                        'language' => ['code' => $this->templateLanguage($locale)],
                        'components' => $components,
                    ],
                ]);
        } catch (ConnectionException $e) {
            Log::warning('WhatsApp OTP delivery could not reach the Cloud API.', [
                'phone' => PhoneNumber::mask($phone),
            ]);

            throw new OtpDeliveryException($e);
        }

        if ($response->failed()) {
            // The body carries Meta's error code and message. The code itself
            // is never logged.
            Log::warning('WhatsApp OTP delivery was rejected.', [
                'phone' => PhoneNumber::mask($phone),
                'status' => $response->status(),
                'error' => $response->json('error'),
            ]);

            throw new OtpDeliveryException;
        }
    }

    private function templateLanguage(string $locale): string
    {
        $languages = config('otp.whatsapp.languages', []);

        return (string) ($languages[$locale] ?? $languages['default'] ?? 'en');
    }
}
