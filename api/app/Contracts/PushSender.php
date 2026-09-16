<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\DeviceToken;

/**
 * Delivers one notification to one device.
 *
 * Returning false means the token is gone for good and should be forgotten;
 * a transient failure throws instead, so it can be retried.
 */
interface PushSender
{
    public function send(DeviceToken $token, string $title, string $body, array $data = [], ?int $badge = null): bool;
}
