<?php

declare(strict_types=1);

use App\Contracts\OtpSender;
use App\Exceptions\OtpDeliveryException;
use App\Models\OtpCode;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Facades\Hash;
use Tests\Support\RecordingOtpSender;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->sender = new RecordingOtpSender;
    $this->app->instance(OtpSender::class, $this->sender);
});

it('sends a code and stores only its hash', function (): void {
    $response = $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456']);

    $response->assertStatus(202)
        ->assertJsonPath('data.code_length', 6)
        ->assertJsonStructure(['data' => ['phone', 'code_length', 'expires_at', 'expires_in_seconds']]);

    $record = OtpCode::query()->sole();
    $code = $this->sender->lastCode();

    expect($this->sender->count())->toBe(1)
        ->and($record->phone)->toBe('+38344123456')
        ->and($record->code_hash)->not->toBe($code)
        ->and(Hash::check($code, $record->code_hash))->toBeTrue()
        ->and($record->attempts)->toBe(0)
        ->and($record->consumed_at)->toBeNull()
        ->and($record->expires_at->isFuture())->toBeTrue();
});

it('never returns the code to the caller', function (): void {
    $response = $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456']);

    expect($response->getContent())->not->toContain($this->sender->lastCode())
        ->and($response->json('data.phone'))->not->toBe('+38344123456');
});

it('normalizes the phone number before storing it', function (string $input, ?string $prefix, string $stored): void {
    $this->postJson('/api/v1/auth/otp/request', array_filter([
        'phone' => $input,
        'phone_prefix' => $prefix,
    ]))->assertStatus(202);

    expect(OtpCode::query()->sole()->phone)->toBe($stored);
})->with([
    ['+383 44 123 456', null, '+38344123456'],
    ['+383-44-123-456', null, '+38344123456'],
    ['0038344123456', null, '+38344123456'],
    ['044 123 456', '+383', '+38344123456'],
    ['+359 88 123 4567', null, '+359881234567'],
]);

it('rejects a phone number it cannot read', function (string $input): void {
    $this->postJson('/api/v1/auth/otp/request', ['phone' => $input])
        ->assertStatus(422)
        ->assertJsonValidationErrors('phone');

    expect(OtpCode::query()->count())->toBe(0);
})->with(['', 'not-a-number', '12345', '+0123456789']);

it('retires any code still outstanding for the number', function (): void {
    $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456'])->assertStatus(202);
    $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456'])->assertStatus(202);

    $codes = OtpCode::query()->orderBy('id')->get();

    expect($codes)->toHaveCount(2)
        ->and($codes[0]->consumed_at)->not->toBeNull()
        ->and($codes[1]->consumed_at)->toBeNull();
});

it('allows three codes per phone number every fifteen minutes', function (): void {
    foreach (range(1, 3) as $attempt) {
        $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456'])
            ->assertStatus(202);
    }

    $this->withHeader('Accept-Language', 'mk')
        ->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456'])
        ->assertStatus(429)
        ->assertJsonPath('message', trans('errors.rate_limited', [], 'mk'));

    expect($this->sender->count())->toBe(3);
});

it('counts the phone limit per number, not across numbers', function (): void {
    foreach (range(1, 3) as $attempt) {
        $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456'])->assertStatus(202);
    }

    $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344999888'])
        ->assertStatus(202);
});

it('allows ten codes per IP address every hour', function (): void {
    foreach (range(1, 10) as $index) {
        $this->postJson('/api/v1/auth/otp/request', ['phone' => '+3834412'.str_pad((string) $index, 4, '0', STR_PAD_LEFT)])
            ->assertStatus(202);
    }

    $this->postJson('/api/v1/auth/otp/request', ['phone' => '+38344130000'])
        ->assertStatus(429);

    expect($this->sender->count())->toBe(10);
});

it('reports a delivery failure instead of pretending the code was sent', function (): void {
    $this->sender->failWith = new OtpDeliveryException;

    $this->withHeader('Accept-Language', 'mk')
        ->postJson('/api/v1/auth/otp/request', ['phone' => '+38344123456'])
        ->assertStatus(503)
        ->assertJsonPath('message', trans('auth.otp.delivery_failed', [], 'mk'));
});

it('answers in the language the caller asks for', function (string $locale): void {
    $expected = trans(
        'validation.required',
        ['attribute' => trans('validation.attributes.phone', [], $locale)],
        $locale,
    );

    $this->withHeader('Accept-Language', $locale)
        ->postJson('/api/v1/auth/otp/request', ['phone' => 'nonsense'])
        ->assertStatus(422)
        ->assertJsonPath('message', $expected);
})->with(['mk', 'en']);

it('falls back to the market language when no language is asked for', function (): void {
    $this->withHeader('Accept-Language', 'fr')
        ->postJson('/api/v1/auth/otp/request', ['phone' => 'nonsense'])
        ->assertStatus(422)
        ->assertJsonPath('message', trans(
            'validation.required',
            ['attribute' => trans('validation.attributes.phone', [], config('app.locale'))],
            config('app.locale'),
        ));
});

it('passes the requested locale to the delivery channel', function (): void {
    $this->withHeader('Accept-Language', 'mk')
        ->postJson('/api/v1/auth/otp/request', ['phone' => '+38970123456'])
        ->assertStatus(202);

    expect($this->sender->lastLocale())->toBe('mk');
});
