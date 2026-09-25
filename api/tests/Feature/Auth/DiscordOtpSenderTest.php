<?php

declare(strict_types=1);

use App\Contracts\OtpSender;
use App\Exceptions\OtpDeliveryException;
use App\Support\Otp\DiscordOtpSender;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    config()->set('otp.discord.webhook_url', 'https://discord.com/api/webhooks/1/abc');
    config()->set('otp.discord.timeout', 10);
    config()->set('otp.ttl_minutes', 5);
});

it('is what the container hands back for the discord driver', function (): void {
    config()->set('otp.driver', 'discord');

    expect(app(OtpSender::class))->toBeInstanceOf(DiscordOtpSender::class);
});

it('posts the code and the number in full, because relaying needs both', function (): void {
    Http::fake(['discord.com/*' => Http::response('', 204)]);

    (new DiscordOtpSender)->send('+38970123456', '483920', 'mk');

    Http::assertSent(function ($request): bool {
        $content = $request->data()['content'];

        // In full: masked, this driver cannot tell one friend from another,
        // which is the only reason it exists.
        return str_contains($content, '+38970123456')
            && str_contains($content, '483920')
            && str_contains($content, '5 minutes');
    });
});

it('pings nobody', function (): void {
    Http::fake(['discord.com/*' => Http::response('', 204)]);

    (new DiscordOtpSender)->send('+38970123456', '483920', 'mk');

    Http::assertSent(fn ($request): bool => $request->data()['allowed_mentions'] === ['parse' => []]);
});

it('fails loudly when it is not configured', function (): void {
    config()->set('otp.discord.webhook_url', null);

    expect(fn () => (new DiscordOtpSender)->send('+38970123456', '483920', 'mk'))
        ->toThrow(OtpDeliveryException::class);
});

it('fails loudly when the webhook is gone, rather than reporting a code sent', function (): void {
    Http::fake(['discord.com/*' => Http::response('', 404)]);

    expect(fn () => (new DiscordOtpSender)->send('+38970123456', '483920', 'mk'))
        ->toThrow(OtpDeliveryException::class);
});

it('fails loudly when Discord cannot be reached', function (): void {
    Http::fake(fn () => throw new ConnectionException('down'));

    expect(fn () => (new DiscordOtpSender)->send('+38970123456', '483920', 'mk'))
        ->toThrow(OtpDeliveryException::class);
});
