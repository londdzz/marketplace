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
 * Firebase Cloud Messaging, HTTP v1.
 *
 * Authenticates as the service account: a short-lived JWT is exchanged for an
 * OAuth access token, which is cached until just before it expires.
 */
final class FcmPushSender implements PushSender
{
    private const TOKEN_CACHE_KEY = 'fcm:access-token';

    public function send(DeviceToken $token, string $title, string $body, array $data = [], ?int $badge = null): bool
    {
        $projectId = (string) config('push.fcm.project_id');

        if ($projectId === '') {
            throw new RuntimeException('FCM is not configured: no project id.');
        }

        $url = str_replace(':project', $projectId, (string) config('push.fcm.endpoint'));

        $response = Http::withToken($this->accessToken())
            ->timeout((int) config('push.fcm.timeout'))
            ->asJson()
            ->post($url, [
                'message' => [
                    'token' => $token->token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => array_map('strval', $data),
                    'android' => [
                        'priority' => 'high',
                    ],
                ],
            ]);

        if ($response->successful()) {
            return true;
        }

        $status = $response->status();
        $reason = (string) $response->json('error.status', '');

        // The device uninstalled the app or the token was replaced. Retrying
        // will never work, so the caller is told to forget it.
        if ($status === 404 || $reason === 'NOT_FOUND' || $reason === 'UNREGISTERED') {
            return false;
        }

        if ($status === 400 && str_contains((string) $response->json('error.message', ''), 'not a valid FCM registration token')) {
            return false;
        }

        Log::warning('FCM rejected a notification.', [
            'status' => $status,
            'error' => $response->json('error'),
        ]);

        throw new RuntimeException('FCM delivery failed with status '.$status.'.');
    }

    /**
     * An OAuth access token for the service account, cached for slightly less
     * than its lifetime.
     */
    private function accessToken(): string
    {
        return Cache::remember(self::TOKEN_CACHE_KEY, now()->addMinutes(50), function (): string {
            $credentials = $this->credentials();

            $now = time();
            $claims = [
                'iss' => $credentials['client_email'],
                'scope' => (string) config('push.fcm.scope'),
                'aud' => (string) config('push.fcm.token_endpoint'),
                'iat' => $now,
                'exp' => $now + 3600,
            ];

            $jwt = $this->signRs256($claims, $credentials['private_key']);

            $response = Http::asForm()
                ->timeout((int) config('push.fcm.timeout'))
                ->post((string) config('push.fcm.token_endpoint'), [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt,
                ]);

            if ($response->failed()) {
                throw new RuntimeException('Could not obtain an FCM access token.');
            }

            return (string) $response->json('access_token');
        });
    }

    /**
     * @return array{client_email: string, private_key: string}
     */
    private function credentials(): array
    {
        $path = (string) config('push.fcm.credentials');

        if (! is_file($path)) {
            throw new RuntimeException("FCM credentials not found at [{$path}].");
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        if (! is_array($decoded) || ! isset($decoded['client_email'], $decoded['private_key'])) {
            throw new RuntimeException('FCM credentials are not a service account file.');
        }

        return [
            'client_email' => (string) $decoded['client_email'],
            'private_key' => (string) $decoded['private_key'],
        ];
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function signRs256(array $claims, string $privateKey): string
    {
        $segments = [
            self::base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR)),
            self::base64Url(json_encode($claims, JSON_THROW_ON_ERROR)),
        ];

        $signingInput = implode('.', $segments);
        $signature = '';

        if (! openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Could not sign the FCM assertion.');
        }

        return $signingInput.'.'.self::base64Url($signature);
    }

    private static function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
