<?php

declare(strict_types=1);

use App\Contracts\OtpSender;
use App\Models\OtpCode;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\Support\RecordingOtpSender;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->sender = new RecordingOtpSender;
    $this->app->instance(OtpSender::class, $this->sender);
});

/**
 * Ask for a code and hand back the value the delivery channel received.
 */
function requestCode(string $phone = '+38344123456'): string
{
    test()->postJson('/api/v1/auth/otp/request', ['phone' => $phone])->assertStatus(202);

    return test()->sender->lastCode();
}

it('opens an account on the first successful verification', function (): void {
    $code = requestCode();

    $response = $this->withHeader('Accept-Language', 'sq')
        ->postJson('/api/v1/auth/otp/verify', [
            'phone' => '+38344123456',
            'code' => $code,
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.user.phone', '+38344123456')
        ->assertJsonPath('data.user.country_code', 'XK')
        ->assertJsonPath('data.user.credits', 0)
        ->assertJsonStructure(['data' => ['token', 'token_type', 'user' => ['id', 'phone', 'seller_type']]]);

    $user = User::query()->sole();

    expect($user->phone)->toBe('+38344123456')
        ->and($user->phone_verified_at)->not->toBeNull()
        ->and($user->preferred_language)->toBe('sq')
        ->and(PersonalAccessToken::query()->count())->toBe(1);
});

it('issues a token that works against the authenticated endpoints', function (): void {
    $code = requestCode();

    $token = $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38344123456',
        'code' => $code,
    ])->json('data.token');

    $this->withToken($token)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.phone', '+38344123456');
});

it('signs an existing account back in without creating a second one', function (): void {
    $existing = User::factory()->create(['phone' => '+38344123456', 'country_code' => 'XK']);

    $code = requestCode();

    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38344123456',
        'code' => $code,
    ])
        ->assertOk()
        ->assertJsonPath('data.user.id', $existing->id);

    expect(User::query()->count())->toBe(1);
});

it('burns the code so it cannot be used twice', function (): void {
    $code = requestCode();

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(201);

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(422);

    expect(PersonalAccessToken::query()->count())->toBe(1);
});

it('rejects a wrong code and counts the attempt', function (): void {
    requestCode();

    $this->withHeader('Accept-Language', 'sq')
        ->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => '000000'])
        ->assertStatus(422)
        ->assertJsonPath('message', trans('auth.otp.invalid', [], 'sq'));

    expect(OtpCode::query()->sole()->attempts)->toBe(1)
        ->and(User::query()->count())->toBe(0);
});

it('rejects an expired code', function (): void {
    $code = requestCode();

    Carbon::setTestNow(Carbon::now()->addMinutes(config('otp.ttl_minutes') + 1));

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(422);

    expect(User::query()->count())->toBe(0);

    Carbon::setTestNow();
});

it('accepts a code that has not quite expired', function (): void {
    $code = requestCode();

    Carbon::setTestNow(Carbon::now()->addMinutes(config('otp.ttl_minutes'))->subSecond());

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(201);

    Carbon::setTestNow();
});

it('burns the code once the attempts are exhausted', function (): void {
    $code = requestCode();
    $maxAttempts = (int) config('otp.max_attempts');

    foreach (range(1, $maxAttempts - 1) as $attempt) {
        $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => '000000'])
            ->assertStatus(422);
    }

    // The last wrong guess reports exhaustion rather than another plain refusal.
    $this->withHeader('Accept-Language', 'sq')
        ->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => '000000'])
        ->assertStatus(429)
        ->assertJsonPath('message', trans('auth.otp.too_many_attempts', [], 'sq'));

    // Even the right code is no good now.
    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(422);

    expect(OtpCode::query()->sole()->consumed_at)->not->toBeNull()
        ->and(User::query()->count())->toBe(0);
});

it('lets a new code be requested after the attempts run out', function (): void {
    requestCode();

    foreach (range(1, (int) config('otp.max_attempts')) as $attempt) {
        $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => '000000']);
    }

    $fresh = requestCode();

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $fresh])
        ->assertStatus(201);
});

it('refuses a code that belongs to a different number', function (): void {
    $code = requestCode('+38344123456');
    requestCode('+38970123456');

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38970123456', 'code' => $code])
        ->assertStatus(422);

    expect(User::query()->count())->toBe(0);
});

it('refuses to sign in a blocked account', function (): void {
    User::factory()->blocked()->create(['phone' => '+38344123456', 'country_code' => 'XK']);

    $code = requestCode();

    $this->withHeader('Accept-Language', 'sq')
        ->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(403)
        ->assertJsonPath('message', trans('auth.blocked', [], 'sq'));

    expect(PersonalAccessToken::query()->count())->toBe(0);
});

it('works out the country from the dialling prefix', function (string $phone, string $country): void {
    $code = requestCode($phone);

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => $phone, 'code' => $code])
        ->assertStatus(201)
        ->assertJsonPath('data.user.country_code', $country);
})->with([
    ['+38344123456', 'XK'],
    ['+355691234567', 'AL'],
    ['+38970123456', 'MK'],
    ['+381641234567', 'RS'],
    ['+359881234567', 'BG'],
]);

it('falls back to the default country for a number from outside the region', function (): void {
    $code = requestCode('+41791234567');

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+41791234567', 'code' => $code])
        ->assertStatus(201)
        ->assertJsonPath('data.user.country_code', config('app.default_country'));
});

it('accepts a country the caller states explicitly', function (): void {
    $code = requestCode('+41791234567');

    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+41791234567',
        'code' => $code,
        'country_code' => 'al',
    ])
        ->assertStatus(201)
        ->assertJsonPath('data.user.country_code', 'AL');
});

it('rejects a country that is not one of ours', function (): void {
    $code = requestCode();

    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38344123456',
        'code' => $code,
        'country_code' => 'DE',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('country_code');
});

it('defaults a new account to the language the request was made in', function (): void {
    $code = requestCode();

    $this->withHeader('Accept-Language', 'mk')
        ->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(201);

    expect(User::query()->sole()->preferred_language)->toBe('mk');
});

it('stores the language the account signed up in', function (): void {
    $code = requestCode();

    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38344123456',
        'code' => $code,
        'locale' => 'bg',
    ])->assertStatus(201);

    expect(User::query()->sole()->preferred_language)->toBe('bg');
});

it('validates the shape of the code', function (string $code): void {
    requestCode();

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => $code])
        ->assertStatus(422)
        ->assertJsonValidationErrors('code');
})->with(['', 'abcdef', '12345', '1234567']);

it('refuses to verify when no code was ever requested', function (): void {
    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '+38344123456', 'code' => '123456'])
        ->assertStatus(422);

    expect(User::query()->count())->toBe(0);
});

it('names the device on the token it issues', function (): void {
    $code = requestCode();

    $this->postJson('/api/v1/auth/otp/verify', [
        'phone' => '+38344123456',
        'code' => $code,
        'device_name' => 'iPhone 15',
    ])->assertStatus(201);

    expect(PersonalAccessToken::query()->sole()->name)->toBe('iPhone 15');
});
