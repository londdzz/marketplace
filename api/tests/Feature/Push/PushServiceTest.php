<?php

declare(strict_types=1);

use App\Contracts\PushSender;
use App\Data\PushMessage;
use App\Enums\Platform;
use App\Models\DeviceToken;
use App\Models\User;
use App\Services\PushService;
use Database\Seeders\CountrySeeder;
use RuntimeException;
use Tests\Support\RecordingPushSender;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->sender = new RecordingPushSender;
    $this->app->instance(PushSender::class, $this->sender);

    $this->push = app(PushService::class);
    $this->user = User::factory()->create(['country_code' => 'XK', 'preferred_language' => 'sq']);
});

function registerDevice(User $user, string $token, Platform $platform = Platform::Ios): DeviceToken
{
    return DeviceToken::query()->create([
        'user_id' => $user->id,
        'token' => $token,
        'platform' => $platform,
    ]);
}

it('sends to every device an account has registered', function (): void {
    registerDevice($this->user, 'iphone', Platform::Ios);
    registerDevice($this->user, 'pixel', Platform::Android);

    $delivered = $this->push->toUser($this->user->fresh(), new PushMessage(
        titleKey: 'push.listing_expiring.title',
        bodyKey: 'push.listing_expiring.body',
        bodyReplacements: ['listing' => 'VW Passat 2015', 'hours' => 24],
    ));

    expect($delivered)->toBe(2)
        ->and(array_column($this->sender->sent, 'platform'))->toBe(['ios', 'android']);
});

it('writes the notification in the language the account chose', function (string $language): void {
    $user = User::factory()->create(['country_code' => 'XK', 'preferred_language' => $language]);
    registerDevice($user, 'device-'.$language);

    $this->push->toUser($user->fresh(), new PushMessage(
        titleKey: 'push.listing_expiring.title',
        bodyKey: 'push.listing_expiring.body',
        bodyReplacements: ['listing' => 'VW Passat', 'hours' => 24],
    ));

    expect($this->sender->last()['title'])
        ->toBe(trans('push.listing_expiring.title', [], $language));
})->with(['sq', 'mk', 'sr', 'bg', 'en']);

it('fills in the values the message carries', function (): void {
    registerDevice($this->user, 'iphone');

    $this->push->toUser($this->user->fresh(), new PushMessage(
        titleKey: 'push.listing_expiring.title',
        bodyKey: 'push.listing_expiring.body',
        bodyReplacements: ['listing' => 'VW Passat 2015', 'hours' => 12],
        data: ['type' => 'listing_expiring', 'listing_id' => 'abc'],
    ));

    $sent = $this->sender->last();

    expect($sent['body'])->toContain('VW Passat 2015')
        ->and($sent['body'])->toContain('12')
        ->and($sent['data'])->toBe(['type' => 'listing_expiring', 'listing_id' => 'abc']);
});

it('forgets a device the store says is gone', function (): void {
    registerDevice($this->user, 'stale-token');
    registerDevice($this->user, 'good-token');
    $this->sender->unregistered = ['stale-token'];

    $delivered = $this->push->toUser($this->user->fresh(), new PushMessage(
        titleKey: 'push.listing_expiring.title',
        bodyKey: 'push.listing_expiring.body',
    ));

    expect($delivered)->toBe(1)
        ->and(DeviceToken::query()->pluck('token')->all())->toBe(['good-token']);
});

it('keeps a device that failed for a passing reason', function (): void {
    registerDevice($this->user, 'iphone');
    $this->sender->failWith = new RuntimeException('APNs timed out');

    $delivered = $this->push->toUser($this->user->fresh(), new PushMessage(
        titleKey: 'push.listing_expiring.title',
        bodyKey: 'push.listing_expiring.body',
    ));

    // The next run of the job will try again.
    expect($delivered)->toBe(0)
        ->and(DeviceToken::query()->count())->toBe(1);
});

it('sends nothing to an account with no devices', function (): void {
    expect($this->push->toUser($this->user, new PushMessage(
        titleKey: 'push.listing_expiring.title',
        bodyKey: 'push.listing_expiring.body',
    )))->toBe(0)
        ->and($this->sender->count())->toBe(0);
});

it('falls back to English for a language we do not ship', function (): void {
    $user = User::factory()->create(['country_code' => 'XK']);
    $user->forceFill(['preferred_language' => 'de'])->save();
    registerDevice($user, 'german-phone');

    $this->push->toUser($user->fresh(), new PushMessage(
        titleKey: 'push.listing_expiring.title',
        bodyKey: 'push.listing_expiring.body',
    ));

    expect($this->sender->last()['title'])->toBe(trans('push.listing_expiring.title', [], 'en'));
});
