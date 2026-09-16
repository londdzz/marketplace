<?php

declare(strict_types=1);

namespace App\Support\Push;

use App\Contracts\PushSender;
use App\Models\DeviceToken;
use Illuminate\Support\Facades\Log;

/**
 * Writes the notification to the log and sends nothing. Development only.
 */
final class LogPushSender implements PushSender
{
    public function send(DeviceToken $token, string $title, string $body, array $data = [], ?int $badge = null): bool
    {
        Log::info('Push notification (not sent)', [
            'user_id' => $token->user_id,
            'platform' => $token->platform->value,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);

        return true;
    }
}
