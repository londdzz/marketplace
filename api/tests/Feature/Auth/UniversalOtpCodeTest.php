<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\CountrySeeder;

/**
 * The code that lets anybody in, for handing a test build to people without
 * relaying a code to each of them. It is a real hole and is treated as one.
 */
beforeEach(function (): void {
    // An account is created on first sign-in and points at a country.
    $this->seed(CountrySeeder::class);

    config(['otp.universal_code' => '751903']);
});

it('signs in and opens an account without a code ever being sent', function (): void {
    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38970111222',
        'code' => '751903',
    ])->assertCreated()->assertJsonStructure(['data' => ['token', 'user' => ['id', 'phone']]]);

    expect(User::query()->where('phone', '+38970111222')->exists())->toBeTrue();
});

it('is refused in production, whatever it is set to', function (): void {
    app()->detectEnvironment(fn (): string => 'production');

    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38970111333',
        'code' => '751903',
    ])->assertStatus(422);

    expect(User::query()->where('phone', '+38970111333')->exists())->toBeFalse();
});

it('does not turn every code into a valid one', function (): void {
    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38970111444',
        'code' => '751904',
    ])->assertStatus(422);

    expect(User::query()->where('phone', '+38970111444')->exists())->toBeFalse();
});

it('stays off when nothing is configured', function (): void {
    config(['otp.universal_code' => null]);

    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38970111555',
        'code' => '751903',
    ])->assertStatus(422);
});
