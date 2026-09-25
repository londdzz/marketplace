<?php

declare(strict_types=1);

use App\Support\Sms\SmsLength;

/**
 * The sign-in message has to fit in one SMS, in every language.
 *
 * A network bills per segment. Every language but English is UCS-2 — Cyrillic
 * for Macedonian, Serbian and Bulgarian, and Albanian's ë does it on its own —
 * so the budget is 70 characters, not 160. Macedonian currently uses 53 of
 * them. Prefix the message with a brand name and it silently becomes two
 * segments, which doubles the cost of every sign-in the marketplace ever does
 * and reports nothing anywhere.
 *
 * This is the only thing that notices.
 */
it('fits the sign-in code into a single SMS segment in every language', function (string $locale): void {
    $message = trans('auth.otp.message', ['code' => '123456', 'minutes' => 5], $locale);

    expect($message)->not->toContain(':code')
        ->and($message)->not->toContain(':minutes');

    $limit = SmsLength::isGsm7($message) ? 160 : 70;

    expect(SmsLength::segments($message))->toBe(
        1,
        sprintf(
            '[%s] is %d characters of a %d character segment: "%s"',
            $locale,
            mb_strlen($message),
            $limit,
            $message,
        ),
    );
})->with(['en', 'mk', 'sq', 'sr', 'bg']);

it('knows which alphabet a message needs', function (): void {
    expect(SmsLength::isGsm7('Your code is 123456.'))->toBeTrue()
        // One Cyrillic letter is enough.
        ->and(SmsLength::isGsm7('Вашиот код'))->toBeFalse()
        // So is one Albanian ë, which is the one people do not expect.
        ->and(SmsLength::isGsm7('Kodi juaj është'))->toBeFalse();
});

it('counts segments at the boundary of each alphabet', function (): void {
    expect(SmsLength::segments(str_repeat('a', 160)))->toBe(1)
        ->and(SmsLength::segments(str_repeat('a', 161)))->toBe(2)
        ->and(SmsLength::segments(str_repeat('ш', 70)))->toBe(1)
        ->and(SmsLength::segments(str_repeat('ш', 71)))->toBe(2)
        // A euro sign is in the alphabet but is sent as two characters, so 80
        // of them fill a 160 character segment exactly.
        ->and(SmsLength::segments(str_repeat('€', 80)))->toBe(1)
        ->and(SmsLength::segments(str_repeat('€', 81)))->toBe(2);
});
