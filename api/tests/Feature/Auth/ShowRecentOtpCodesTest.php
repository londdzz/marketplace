<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;

/**
 * The command reads the log file itself, so every test here writes a real one
 * and points storage at it.
 */
function writeOtpLog(string $body): void
{
    File::ensureDirectoryExists(storage_path('logs'));
    File::put(storage_path('logs/laravel.log'), $body);
}

function otpLine(string $when, string $masked, string $code): string
{
    return "[{$when}] testing.INFO: OTP code generated "
        .'{"phone":"'.$masked.'","code":"'.$code.'","locale":"mk"}'."\n";
}

afterEach(function (): void {
    File::delete(storage_path('logs/laravel.log'));
});

it('shows the codes the log driver wrote, newest last', function (): void {
    config()->set('otp.driver', 'log');

    writeOtpLog(
        otpLine('2026-09-25 10:00:00', '+389*****111', '111111')
        .otpLine('2026-09-25 10:05:00', '+389*****222', '222222')
    );

    $this->artisan('otp:recent')
        ->expectsOutputToContain('111111')
        ->expectsOutputToContain('222222')
        ->assertSuccessful();
});

it('filters to one number, masking the one it is given the same way', function (): void {
    config()->set('otp.driver', 'log');

    writeOtpLog(
        otpLine('2026-09-25 10:00:00', '+389*****111', '111111')
        .otpLine('2026-09-25 10:05:00', '+389*****222', '222222')
    );

    $this->artisan('otp:recent', ['phone' => '+38970000222'])
        ->expectsOutputToContain('222222')
        ->doesntExpectOutputToContain('111111')
        ->assertSuccessful();
});

it('keeps only the newest when more codes exist than asked for', function (): void {
    config()->set('otp.driver', 'log');

    writeOtpLog(
        otpLine('2026-09-25 10:00:00', '+389*****111', '111111')
        .otpLine('2026-09-25 10:05:00', '+389*****111', '222222')
        .otpLine('2026-09-25 10:09:00', '+389*****111', '333333')
    );

    $this->artisan('otp:recent', ['--limit' => 2])
        ->expectsOutputToContain('333333')
        ->expectsOutputToContain('222222')
        ->doesntExpectOutputToContain('111111')
        ->assertSuccessful();
});

it('says so rather than showing nothing when no code has been asked for yet', function (): void {
    config()->set('otp.driver', 'log');

    writeOtpLog("[2026-09-25 10:00:00] testing.INFO: something else entirely\n");

    $this->artisan('otp:recent')
        ->expectsOutputToContain('No codes in the log yet')
        ->assertSuccessful();
});

it('refuses when the driver actually sends, because then the log holds nothing', function (): void {
    config()->set('otp.driver', 'messaggio');

    $this->artisan('otp:recent')
        ->expectsOutputToContain('codes are sent rather than logged')
        ->assertFailed();
});
