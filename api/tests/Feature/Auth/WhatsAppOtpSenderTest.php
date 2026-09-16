<?php

declare(strict_types=1);

use App\Exceptions\OtpDeliveryException;
use App\Support\Otp\WhatsAppOtpSender;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    config()->set('otp.whatsapp.phone_number_id', '1234567890');
    config()->set('otp.whatsapp.access_token', 'test-token');
    config()->set('otp.whatsapp.template', 'otp_code');
});

it('sends an authentication template carrying the code', function (): void {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]]),
    ]);

    (new WhatsAppOtpSender)->send('+38344123456', '123456', 'sq');

    Http::assertSent(function (Request $request): bool {
        $body = $request->data();

        return $request->url() === 'https://graph.facebook.com/v21.0/1234567890/messages'
            && $request->hasHeader('Authorization', 'Bearer test-token')
            && $body['messaging_product'] === 'whatsapp'
            && $body['to'] === '38344123456'
            && $body['type'] === 'template'
            && $body['template']['name'] === 'otp_code'
            && $body['template']['language']['code'] === 'sq'
            && $body['template']['components'][0]['parameters'][0]['text'] === '123456';
    });
});

it('repeats the code on the copy-code button so autofill works', function (): void {
    Http::fake(['graph.facebook.com/*' => Http::response([])]);

    (new WhatsAppOtpSender)->send('+38344123456', '123456', 'sq');

    Http::assertSent(function (Request $request): bool {
        $button = $request->data()['template']['components'][1];

        return $button['type'] === 'button'
            && $button['sub_type'] === 'url'
            && $button['parameters'][0]['text'] === '123456';
    });
});

it('leaves the button out when the template has none', function (): void {
    config()->set('otp.whatsapp.copy_code_button', false);
    Http::fake(['graph.facebook.com/*' => Http::response([])]);

    (new WhatsAppOtpSender)->send('+38344123456', '123456', 'sq');

    Http::assertSent(fn (Request $request): bool => count($request->data()['template']['components']) === 1);
});

it('maps each of our languages onto a template language', function (string $locale, string $templateLanguage): void {
    Http::fake(['graph.facebook.com/*' => Http::response([])]);

    (new WhatsAppOtpSender)->send('+38344123456', '123456', $locale);

    Http::assertSent(fn (Request $request): bool => $request->data()['template']['language']['code'] === $templateLanguage);
})->with([
    ['sq', 'sq'],
    ['mk', 'mk'],
    ['sr', 'sr'],
    ['bg', 'bg'],
    ['en', 'en'],
    ['de', 'en'],
]);

it('fails loudly when Meta rejects the message', function (): void {
    Http::fake([
        'graph.facebook.com/*' => Http::response([
            'error' => ['message' => 'Template does not exist', 'code' => 132001],
        ], 400),
    ]);

    expect(fn () => (new WhatsAppOtpSender)->send('+38344123456', '123456', 'sq'))
        ->toThrow(OtpDeliveryException::class);
});

it('fails loudly when it is not configured', function (): void {
    config()->set('otp.whatsapp.access_token', null);
    Http::fake();

    expect(fn () => (new WhatsAppOtpSender)->send('+38344123456', '123456', 'sq'))
        ->toThrow(OtpDeliveryException::class);

    Http::assertNothingSent();
});
