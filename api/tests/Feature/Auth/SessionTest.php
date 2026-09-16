<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\CountrySeeder;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
});

it('revokes the token the request arrived with', function (): void {
    $user = User::factory()->create(['country_code' => 'XK']);
    $token = $user->createToken('iPhone')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/v1/auth/logout')
        ->assertOk()
        ->assertJsonPath('data.message', trans('auth.logged_out', [], $user->preferred_language));

    expect(PersonalAccessToken::query()->count())->toBe(0);

    asNewRequest();

    $this->withToken($token)
        ->getJson('/api/v1/me')
        ->assertStatus(401);
});

it('leaves the account signed in on its other devices', function (): void {
    $user = User::factory()->create(['country_code' => 'XK']);
    $phone = $user->createToken('iPhone')->plainTextToken;
    $tablet = $user->createToken('iPad')->plainTextToken;

    $this->withToken($phone)->postJson('/api/v1/auth/logout')->assertOk();

    asNewRequest();

    $this->withToken($tablet)->getJson('/api/v1/me')->assertOk();

    expect(PersonalAccessToken::query()->sole()->name)->toBe('iPad');
});

it('cannot be called without a token', function (): void {
    $this->withHeader('Accept-Language', 'sq')
        ->postJson('/api/v1/auth/logout')
        ->assertStatus(401)
        ->assertJsonPath('message', trans('auth.unauthenticated', [], 'sq'));
});

it('rejects a token that has already been revoked', function (): void {
    $user = User::factory()->create(['country_code' => 'XK']);
    $token = $user->createToken('iPhone')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

    asNewRequest();

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertStatus(401);
});
