<?php

declare(strict_types=1);

namespace App\Support\Push;

use App\Contracts\PushSender;
use App\Models\DeviceToken;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Apple Push Notification service, token based.
 *
 * The provider token is a JWT signed with the .p8 key using ES256. Apple allows
 * one to be reused for up to an hour, so it is cached rather than minted per
 * notification; minting one per push is how a provider gets rate limited.
 */
final class ApnsPushSender implements PushSender
{
    private const TOKEN_CACHE_KEY = 'apns:provider-token';

    public function send(DeviceToken $token, string $title, string $body, array $data = [], ?int $badge = null): bool
    {
        $endpoint = config('push.apns.production')
            ? config('push.apns.endpoints.production')
            : config('push.apns.endpoints.sandbox');

        $payload = [
            'aps' => array_filter([
                'alert' => ['title' => $title, 'body' => $body],
                'sound' => 'default',
                'badge' => $badge,
            ], static fn ($value): bool => $value !== null),
        ];

        $response = Http::withHeaders([
            'authorization' => 'bearer '.$this->providerToken(),
            'apns-topic' => (string) config('push.apns.bundle_id'),
            'apns-push-type' => 'alert',
            'apns-priority' => '10',
        ])
            ->timeout((int) config('push.apns.timeout'))
            ->withOptions(['version' => 2.0])
            ->asJson()
            ->post($endpoint.$token->token, array_merge($payload, $data));

        if ($response->successful()) {
            return true;
        }

        $reason = (string) $response->json('reason', '');

        // The app is gone from the device, or the token never belonged to this
        // topic. Either way it will never work again.
        if (in_array($reason, ['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'], true)) {
            return false;
        }

        Log::warning('APNs rejected a notification.', [
            'status' => $response->status(),
            'reason' => $reason,
        ]);

        throw new RuntimeException('APNs delivery failed: '.($reason !== '' ? $reason : $response->status()));
    }

    private function providerToken(): string
    {
        return Cache::remember(self::TOKEN_CACHE_KEY, now()->addMinutes(45), function (): string {
            $keyId = (string) config('push.apns.key_id');
            $teamId = (string) config('push.apns.team_id');
            $keyPath = (string) config('push.apns.key_path');

            if ($keyId === '' || $teamId === '' || ! is_file($keyPath)) {
                throw new RuntimeException('APNs is not configured: key id, team id and .p8 key are all required.');
            }

            $header = ['alg' => 'ES256', 'kid' => $keyId];
            $claims = ['iss' => $teamId, 'iat' => time()];

            $signingInput = self::base64Url(json_encode($header, JSON_THROW_ON_ERROR))
                .'.'.self::base64Url(json_encode($claims, JSON_THROW_ON_ERROR));

            $signature = '';
            $key = openssl_pkey_get_private((string) file_get_contents($keyPath));

            if ($key === false || ! openssl_sign($signingInput, $signature, $key, OPENSSL_ALGO_SHA256)) {
                throw new RuntimeException('Could not sign the APNs provider token.');
            }

            return $signingInput.'.'.self::base64Url(self::derToJose($signature));
        });
    }

    /**
     * OpenSSL returns an ECDSA signature as a DER sequence of two integers.
     * JWT wants the two values raw and fixed width, 32 bytes each for P-256.
     */
    private static function derToJose(string $der): string
    {
        $offset = 0;

        if (ord($der[$offset++]) !== 0x30) {
            throw new RuntimeException('Malformed ECDSA signature.');
        }

        if (ord($der[$offset]) > 0x80) {
            $offset += ord($der[$offset]) - 0x80;
        }

        $offset++;

        $read = static function () use ($der, &$offset): string {
            if (ord($der[$offset++]) !== 0x02) {
                throw new RuntimeException('Malformed ECDSA signature.');
            }

            $length = ord($der[$offset++]);
            $value = substr($der, $offset, $length);
            $offset += $length;

            return str_pad(ltrim($value, "\x00"), 32, "\x00", STR_PAD_LEFT);
        };

        return $read().$read();
    }

    private static function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
