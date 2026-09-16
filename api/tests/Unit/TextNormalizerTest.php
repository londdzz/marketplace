<?php

declare(strict_types=1);

use App\Support\TextNormalizer;

it('matches the same word written in Cyrillic and in Latin', function (): void {
    $cyrillic = TextNormalizer::normalize('Пасат');
    $latinSingle = TextNormalizer::normalize('pasat');
    $latinDouble = TextNormalizer::normalize('Passat');

    expect($cyrillic)->toBe('pasat')
        ->and($latinSingle)->toBe('pasat')
        ->and($latinDouble)->toBe('pasat');

    expect(TextNormalizer::matches('Пасат', 'Passat'))->toBeTrue()
        ->and(TextNormalizer::matches('Пасат', 'pasat'))->toBeTrue()
        ->and(TextNormalizer::matches('pasat', 'PASSAT'))->toBeTrue();
});

it('strips Latin diacritics', function (): void {
    expect(TextNormalizer::normalize('Škoda'))->toBe('skoda')
        ->and(TextNormalizer::normalize('skoda'))->toBe('skoda')
        ->and(TextNormalizer::matches('Škoda', 'skoda'))->toBeTrue()
        ->and(TextNormalizer::normalize('Citroën'))->toBe('citroen')
        ->and(TextNormalizer::normalize('Prishtinë'))->toBe('prishtine')
        ->and(TextNormalizer::normalize('Niš'))->toBe('nis');
});

it('transliterates the multi-character Cyrillic letters', function (string $cyrillic, string $latin): void {
    expect(TextNormalizer::normalize($cyrillic))->toBe($latin);
})->with([
    ['ж', 'z'],
    ['ч', 'c'],
    ['ш', 's'],
    ['щ', 'st'],
    ['ю', 'ju'],
    ['я', 'ja'],
    ['њ', 'nj'],
    ['љ', 'lj'],
    ['џ', 'dz'],
    ['ѓ', 'gj'],
    ['ќ', 'kj'],
]);

it('transliterates uppercase Cyrillic the same way as lowercase', function (): void {
    expect(TextNormalizer::normalize('Ж'))->toBe('z')
        ->and(TextNormalizer::normalize('Щ'))->toBe('st')
        ->and(TextNormalizer::normalize('Ю'))->toBe('ju')
        ->and(TextNormalizer::normalize('Џ'))->toBe('dz')
        ->and(TextNormalizer::normalize('Ќ'))->toBe('kj');
});

it('matches Cyrillic and Latin spellings of regional makes and models', function (string $cyrillic, string $latin): void {
    expect(TextNormalizer::matches($cyrillic, $latin))->toBeTrue();
})->with([
    ['Голф', 'Golf'],
    ['Шкода', 'Škoda'],
    ['Мерцедес', 'Mercedes'],
    ['Џип', 'Dzip'],
    ['Њива', 'Njiva'],
    ['Пежо', 'Pezo'],
]);

it('reduces punctuation to single spaces', function (): void {
    expect(TextNormalizer::normalize('Mercedes-Benz'))->toBe('mercedes benz')
        ->and(TextNormalizer::normalize('  Golf   GTI  '))->toBe('golf gti')
        ->and(TextNormalizer::normalize('C-HR'))->toBe('c hr')
        ->and(TextNormalizer::normalize('VW Golf 1.9 TDI'))->toBe('vw golf 1 9 tdi');
});

it('never collapses repeated digits', function (): void {
    expect(TextNormalizer::normalize('2000'))->toBe('2000')
        ->and(TextNormalizer::normalize('911'))->toBe('911')
        ->and(TextNormalizer::normalize('Passat 1999'))->toBe('pasat 1999');
});

it('is idempotent', function (string $value): void {
    $once = TextNormalizer::normalize($value);

    expect(TextNormalizer::normalize($once))->toBe($once);
})->with(['Пасат', 'Škoda', 'Mercedes-Benz', 'BMW 320d', 'Щора']);

it('handles an empty string', function (): void {
    expect(TextNormalizer::normalize(''))->toBe('')
        ->and(TextNormalizer::normalize('   '))->toBe('')
        ->and(TextNormalizer::normalize('---'))->toBe('');
});

it('builds searchable text out of several fields without repeating tokens', function (): void {
    $text = TextNormalizer::normalizeParts(['Volkswagen', 'Passat', 'Пасат', null, '2015', 'Diesel']);

    expect($text)->toBe('volkswagen pasat 2015 diesel');
});
