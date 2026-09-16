<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Contracts\PushSender;
use App\Models\DeviceToken;
use Throwable;

/**
 * Stands in for FCM and APNs and keeps what it was asked to send.
 */
final class RecordingPushSender implements PushSender
{
    /**
     * @var array<int, array{token: string, platform: string, user_id: int, title: string, body: string, data: array<string, mixed>}>
     */
    public array $sent = [];

    /**
     * Tokens the store should report as gone for good.
     *
     * @var array<int, string>
     */
    public array $unregistered = [];

    public ?Throwable $failWith = null;

    public function send(DeviceToken $token, string $title, string $body, array $data = [], ?int $badge = null): bool
    {
        if ($this->failWith instanceof Throwable) {
            throw $this->failWith;
        }

        if (in_array($token->token, $this->unregistered, true)) {
            return false;
        }

        $this->sent[] = [
            'token' => $token->token,
            'platform' => $token->platform->value,
            'user_id' => $token->user_id,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ];

        return true;
    }

    public function count(): int
    {
        return count($this->sent);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function last(): ?array
    {
        $last = end($this->sent);

        return $last === false ? null : $last;
    }
}
