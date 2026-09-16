<?php

declare(strict_types=1);

use App\Enums\Platform;
use App\Models\DeviceToken;
use App\Models\User;
use Database\Seeders\CountrySeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->user = User::factory()->create(['country_code' => 'XK']);
});

it('registers a device for push', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/device-tokens', [
            'token' => 'expo-token-abc',
            'platform' => Platform::Ios->value,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.platform', 'ios');

    $device = DeviceToken::query()->sole();

    expect($device->user_id)->toBe($this->user->id)
        ->and($device->token)->toBe('expo-token-abc')
        ->and($device->platform)->toBe(Platform::Ios)
        ->and($device->last_seen_at)->not->toBeNull();
});

it('refreshes the same token instead of duplicating it', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['token' => 'expo-token-abc', 'platform' => 'ios'])
        ->assertStatus(201);

    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['token' => 'expo-token-abc', 'platform' => 'ios'])
        ->assertOk();

    expect(DeviceToken::query()->count())->toBe(1);
});

it('moves a device to whoever signed in on it last', function (): void {
    $other = User::factory()->create(['country_code' => 'XK']);

    $this->actingAs($other, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['token' => 'shared-handset', 'platform' => 'android']);

    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['token' => 'shared-handset', 'platform' => 'android'])
        ->assertOk();

    $device = DeviceToken::query()->sole();

    // Otherwise the previous account would keep getting this phone's
    // notifications.
    expect($device->user_id)->toBe($this->user->id);
});

it('forgets a device on request', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['token' => 'expo-token-abc', 'platform' => 'ios']);

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson('/api/v1/device-tokens', ['token' => 'expo-token-abc', 'platform' => 'ios'])
        ->assertNoContent();

    expect(DeviceToken::query()->count())->toBe(0);
});

it('will not let one account forget another account device', function (): void {
    $other = User::factory()->create(['country_code' => 'XK']);

    $this->actingAs($other, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['token' => 'their-handset', 'platform' => 'android']);

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson('/api/v1/device-tokens', ['token' => 'their-handset', 'platform' => 'android'])
        ->assertNoContent();

    expect(DeviceToken::query()->count())->toBe(1);
});

it('rejects a platform that is not one of the two stores', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['token' => 'expo-token-abc', 'platform' => 'windows'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('platform');
});

it('requires a token', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['platform' => 'ios'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('token');
});

it('needs a signed-in account', function (): void {
    $this->postJson('/api/v1/device-tokens', ['token' => 'expo-token-abc', 'platform' => 'ios'])
        ->assertStatus(401);
});

it('goes with the account when it is deleted', function (): void {
    $token = $this->user->createToken('iPhone')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/v1/device-tokens', ['token' => 'expo-token-abc', 'platform' => 'ios'])
        ->assertStatus(201);

    $this->withToken($token)->deleteJson('/api/v1/me')->assertOk();

    expect(DeviceToken::query()->count())->toBe(0);
});
