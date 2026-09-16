<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Platform;
use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Support\Carbon;

final class DeviceTokenService
{
    /**
     * Register a device against an account, or move it if it now belongs to
     * someone else.
     *
     * A phone handed on, or a second account signed in on the same device,
     * keeps the same push token. Whoever registered it last owns it, otherwise
     * the previous account would keep receiving notifications meant for the
     * new one.
     */
    public function register(User $user, string $token, Platform $platform): DeviceToken
    {
        $device = DeviceToken::query()->where('token', $token)->first();

        if ($device instanceof DeviceToken) {
            $device->forceFill([
                'user_id' => $user->getKey(),
                'platform' => $platform,
                'last_seen_at' => Carbon::now(),
            ])->save();

            return $device;
        }

        return DeviceToken::query()->create([
            'user_id' => $user->getKey(),
            'token' => $token,
            'platform' => $platform,
            'last_seen_at' => Carbon::now(),
        ]);
    }

    public function forget(User $user, string $token): void
    {
        DeviceToken::query()
            ->where('user_id', $user->getKey())
            ->where('token', $token)
            ->delete();
    }
}
