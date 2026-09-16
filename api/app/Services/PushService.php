<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\PushSender;
use App\Data\PushMessage;
use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends a notification to every device an account has registered, in the
 * language that account chose.
 */
final class PushService
{
    public function __construct(private readonly PushSender $sender) {}

    /**
     * @return int how many devices were reached
     */
    public function toUser(User $user, PushMessage $message): int
    {
        $locale = in_array($user->preferred_language, (array) config('app.supported_locales'), true)
            ? $user->preferred_language
            : (string) config('app.fallback_locale');

        $title = $message->title($locale);
        $body = $message->body($locale);

        $delivered = 0;

        foreach ($user->deviceTokens as $token) {
            if ($this->deliver($token, $title, $body, $message)) {
                $delivered++;
            }
        }

        return $delivered;
    }

    private function deliver(DeviceToken $token, string $title, string $body, PushMessage $message): bool
    {
        try {
            $accepted = $this->sender->send($token, $title, $body, $message->data, $message->badge);
        } catch (Throwable $e) {
            // A transient failure. The next run of the job will try again;
            // nothing here is worth failing a whole batch over.
            Log::warning('Push delivery failed.', [
                'user_id' => $token->user_id,
                'platform' => $token->platform->value,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        if (! $accepted && config('push.delete_unregistered_tokens')) {
            // The store says this device is gone for good.
            $token->delete();

            return false;
        }

        return $accepted;
    }
}
