<?php

declare(strict_types=1);

use App\Support\PhoneNumber;

it('reduces the shapes people type to one stored form', function (string $input, string $expected): void {
    expect(PhoneNumber::normalize($input))->toBe($expected);
})->with([
    ['+38344123456', '+38344123456'],
    ['+383 44 123 456', '+38344123456'],
    ['+383-44-123-456', '+38344123456'],
    ['(+383) 44/123-456', '+38344123456'],
    [' +38344123456 ', '+38344123456'],
    ['0038344123456', '+38344123456'],
    ['00 383 44 123 456', '+38344123456'],
    ['38344123456', '+38344123456'],
]);

it('combines a local number with its dialling prefix', function (): void {
    expect(PhoneNumber::normalize('044 123 456', '+383'))->toBe('+38344123456')
        ->and(PhoneNumber::normalize('44 123 456', '+383'))->toBe('+38344123456')
        ->and(PhoneNumber::normalize('088 123 4567', '+359'))->toBe('+359881234567');
});

it('refuses anything that cannot be a phone number', function (?string $input): void {
    expect(PhoneNumber::normalize((string) $input))->toBeNull();
})->with([
    '',
    '   ',
    'not a number',
    '12345',
    '044123456',
    '+0123456789',
    '+12345678901234567890',
]);

it('never strips a leading zero from a number that claims to be international', function (): void {
    // No country calling code starts with zero, so this is bad input rather
    // than something to be repaired.
    expect(PhoneNumber::normalize('+038344123456'))->toBeNull();
});

it('masks the middle of a number for logs', function (): void {
    expect(PhoneNumber::mask('+38344123456'))->toBe('+383*****456')
        ->and(PhoneNumber::mask('+38344123456'))->not->toContain('44123');
});

it('strips the plus for channels that want digits only', function (): void {
    expect(PhoneNumber::withoutPlus('+38344123456'))->toBe('38344123456');
});

it('agrees with itself about what is valid', function (): void {
    expect(PhoneNumber::isValid('+38344123456'))->toBeTrue()
        ->and(PhoneNumber::isValid('nonsense'))->toBeFalse();
});
