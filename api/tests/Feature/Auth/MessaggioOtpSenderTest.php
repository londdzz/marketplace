<?php

declare(strict_types=1);

use App\Contracts\OtpSender;
use App\Exceptions\OtpDeliveryException;
use App\Support\Otp\MessaggioOtpSender;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    config()->set('otp.messaggio.login', 'test-login');
    config()->set('otp.messaggio.sender', 'Autevo');
    config()->set('otp.messaggio.channels', ['sms']);
    config()->set('otp.ttl_minutes', 5);
});

/** What Messaggio answers when it has taken the message. */
function messaggioAccepted(): array
{
    return ['messages' => [[
        'recipient' => ['phone' => '38970123456'],
        'message_id' => 'ff1ca1f9-94f2-4e43-97ed-a4ca672957c1',
    ]]];
}

it('sends the translated code to the number, without the plus', function (): void {
    Http::fake(['msg.messaggio.com/*' => Http::response(messaggioAccepted())]);

    (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk');

    Http::assertSent(function (Request $request): bool {
        $body = $request->data();

        return $request->url() === 'https://msg.messaggio.com/api/v1/send'
            && $request->hasHeader('Messaggio-Login', 'test-login')
            && $body['recipients'] === [['phone' => '38970123456']]
            && $body['channels'] === ['sms']
            && $body['sms']['from'] === 'Autevo'
            // The Macedonian string, with the code and the lifetime filled in.
            && str_contains($body['sms']['content'][0]['text'], '123456')
            && str_contains($body['sms']['content'][0]['text'], 'Вашиот код');
    });
});

it('writes the message in the recipient language', function (string $locale, string $fragment): void {
    Http::fake(['msg.messaggio.com/*' => Http::response(messaggioAccepted())]);

    (new MessaggioOtpSender)->send('+38970123456', '123456', $locale);

    Http::assertSent(fn (Request $request): bool => str_contains(
        $request->data()['sms']['content'][0]['text'],
        $fragment,
    ));
})->with([
    ['en', 'Your verification code'],
    ['mk', 'Вашиот код'],
    ['sq', 'Kodi juaj'],
    ['bg', 'Вашият код'],
]);

it('carries the same text on every channel it is told to try', function (): void {
    config()->set('otp.messaggio.channels', ['viber', 'sms']);
    Http::fake(['msg.messaggio.com/*' => Http::response(messaggioAccepted())]);

    (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk');

    Http::assertSent(function (Request $request): bool {
        $body = $request->data();

        // Order is the preference order: Viber first, SMS for whoever Viber
        // could not reach. Viber is about a third of the price.
        return $body['channels'] === ['viber', 'sms']
            && $body['viber']['content'][0]['text'] === $body['sms']['content'][0]['text']
            && $body['options']['ttl'] === 60;
    });
});

it('fails when a recipient is refused, even though the request succeeded', function (): void {
    // This is the shape that matters: 200 OK, with the failure beside the
    // recipient. Trusting the status code would tell somebody their code was
    // on its way when nothing was ever sent.
    Http::fake(['msg.messaggio.com/*' => Http::response(['messages' => [[
        'recipient' => ['phone' => '123-bad-phone'],
        'error' => ['title' => 'Invalid phone number', 'detail' => 'invalid phone number'],
    ]]])]);

    expect(fn () => (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk'))
        ->toThrow(OtpDeliveryException::class);
});

it('fails when the reply acknowledges no message at all', function (): void {
    Http::fake(['msg.messaggio.com/*' => Http::response(['messages' => []])]);

    expect(fn () => (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk'))
        ->toThrow(OtpDeliveryException::class);
});

it('fails when a message comes back with no id', function (): void {
    Http::fake(['msg.messaggio.com/*' => Http::response(['messages' => [[
        'recipient' => ['phone' => '38970123456'],
        'message_id' => '',
    ]]])]);

    expect(fn () => (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk'))
        ->toThrow(OtpDeliveryException::class);
});

it('fails when the request is rejected outright', function (): void {
    Http::fake(['msg.messaggio.com/*' => Http::response(['error' => 'unauthorized'], 401)]);

    expect(fn () => (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk'))
        ->toThrow(OtpDeliveryException::class);
});

it('refuses to send when it has no login', function (): void {
    config()->set('otp.messaggio.login', null);
    Http::fake();

    expect(fn () => (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk'))
        ->toThrow(OtpDeliveryException::class);

    Http::assertNothingSent();
});

it('refuses to send when no channel is configured', function (): void {
    config()->set('otp.messaggio.channels', []);
    Http::fake();

    expect(fn () => (new MessaggioOtpSender)->send('+38970123456', '123456', 'mk'))
        ->toThrow(OtpDeliveryException::class);

    Http::assertNothingSent();
});

it('is the driver the container builds when messaggio is configured', function (): void {
    config()->set('otp.driver', 'messaggio');

    expect(app(OtpSender::class))->toBeInstanceOf(MessaggioOtpSender::class);
});
