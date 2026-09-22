<?php

declare(strict_types=1);

/**
 * Behind a proxy every request reaches PHP from the loopback, so without this
 * $request->ip() answers 127.0.0.1 for everybody — one rate-limit bucket for
 * the whole internet, and ten OTP requests an hour shared between every person
 * trying to sign in.
 */
it('reads the caller\'s address from the proxy when the proxy is local', function (): void {
    $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
        ->withHeaders(['X-Forwarded-For' => '77.28.10.5'])
        ->get('/api/v1/countries')
        ->assertOk();

    expect(request()->ip())->toBe('77.28.10.5');
});

it('ignores a forwarded address from anywhere else', function (): void {
    // A phone on the wifi talking to `artisan serve` directly, or anyone who
    // fancies naming an address that is not theirs.
    $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.20'])
        ->withHeaders(['X-Forwarded-For' => '77.28.10.5'])
        ->get('/api/v1/countries')
        ->assertOk();

    expect(request()->ip())->toBe('192.168.1.20');
});
