<?php

declare(strict_types=1);

use App\Contracts\OtpSender;
use App\Models\OtpCode;
use App\Support\Otp\LogOtpSender;
use Illuminate\Support\Facades\Http;

it('sends a sample through the configured driver and stores nothing', function (): void {
    config()->set('otp.driver', 'discord');
    config()->set('otp.discord.webhook_url', 'https://discord.com/api/webhooks/1/abc');

    Http::fake(['discord.com/*' => Http::response('', 204)]);

    $this->artisan('otp:ping', ['phone' => '+38970123456'])->assertSuccessful();

    Http::assertSentCount(1);

    // A sample is a message, never a way in.
    expect(OtpCode::query()->count())->toBe(0);
});

it('refuses a number sign-in would refuse', function (): void {
    $this->artisan('otp:ping', ['phone' => 'not a number'])
        ->expectsOutputToContain('not a number this would accept')
        ->assertFailed();
});

it('says so when the driver only writes to the log', function (): void {
    config()->set('otp.driver', 'log');
    $this->app->bind(OtpSender::class, fn (): OtpSender => new LogOtpSender);

    $this->artisan('otp:ping', ['phone' => '+38970123456'])
        ->expectsOutputToContain('goes to storage/logs/laravel.log')
        ->assertSuccessful();
});

it('reports the failure rather than claiming it sent', function (): void {
    config()->set('otp.driver', 'discord');
    config()->set('otp.discord.webhook_url', 'https://discord.com/api/webhooks/1/abc');

    Http::fake(['discord.com/*' => Http::response('', 404)]);

    $this->artisan('otp:ping', ['phone' => '+38970123456'])
        ->expectsOutputToContain('refused it')
        ->assertFailed();
});
