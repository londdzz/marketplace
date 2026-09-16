<?php

declare(strict_types=1);

namespace App\Support\Push;

use App\Contracts\PushSender;
use App\Enums\Platform;
use App\Models\DeviceToken;

/**
 * Sends each notification through whichever service the device belongs to.
 */
final class PlatformPushSender implements PushSender
{
    public function __construct(
        private readonly ApnsPushSender $apns,
        private readonly FcmPushSender $fcm,
    ) {}

    public function send(DeviceToken $token, string $title, string $body, array $data = [], ?int $badge = null): bool
    {
        return match ($token->platform) {
            Platform::Ios => $this->apns->send($token, $title, $body, $data, $badge),
            Platform::Android => $this->fcm->send($token, $title, $body, $data, $badge),
        };
    }
}
