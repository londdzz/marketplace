<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Turns any searchable text into a single canonical, script-insensitive form.
 *
 * Everything that is searchable is stored through this class into a dedicated
 * normalized column, and every incoming query is normalized the same way, so a
 * buyer typing "Пасат" finds a listing written "Passat" and "Škoda" matches
 * "skoda".
 *
 * The pipeline is:
 *   1. lowercase (UTF-8 aware)
 *   2. transliterate Cyrillic (Serbian, Macedonian, Bulgarian) to Latin
 *   3. strip Latin diacritics (š → s, ć → c, ë → e, ...)
 *   4. reduce anything that is not [a-z0-9] to a single space
 *   5. collapse repeated letters (passat → pasat) so that transliterations,
 *      which never double a consonant, line up with native Latin spellings
 *   6. collapse whitespace and trim
 *
 * Step 5 only ever collapses letters, never digits: "2000" must not become
 * "20" and "911" must not become "91".
 *
 * Known limit: transliteration cannot bridge a spelling that differs in the
 * source alphabet itself. Cyrillic к always becomes k, so "Октавија" normalizes
 * to "oktavija" and does not match the Latin "Octavia". Cross-script matching
 * works for the vast majority of makes and models, where the two spellings
 * agree once diacritics and doubled letters are gone.
 */
final class TextNormalizer
{
    /**
     * Cyrillic letters that transliterate to more than one Latin character, or
     * that differ between the Serbian, Macedonian and Bulgarian alphabets.
     *
     * Ordered longest-first is not required: strtr() already prefers the
     * longest matching key.
     *
     * @var array<string, string>
     */
    private const CYRILLIC = [
        // Multi-character cases called out by the specification.
        'ж' => 'z',
        'ч' => 'c',
        'ш' => 's',
        'щ' => 'st',
        'ю' => 'ju',
        'я' => 'ja',
        'њ' => 'nj',
        'љ' => 'lj',
        'џ' => 'dz',
        'ѓ' => 'gj',
        'ќ' => 'kj',

        // Remaining Serbian / Macedonian / Bulgarian letters.
        'а' => 'a',
        'б' => 'b',
        'в' => 'v',
        'г' => 'g',
        'д' => 'd',
        'ђ' => 'dj',
        'е' => 'e',
        'ё' => 'e',
        'з' => 'z',
        'ѕ' => 'dz',
        'и' => 'i',
        'й' => 'j',
        'ј' => 'j',
        'к' => 'k',
        'л' => 'l',
        'м' => 'm',
        'н' => 'n',
        'о' => 'o',
        'п' => 'p',
        'р' => 'r',
        'с' => 's',
        'т' => 't',
        'ћ' => 'c',
        'у' => 'u',
        'ў' => 'u',
        'ф' => 'f',
        'х' => 'h',
        'ц' => 'c',
        'ъ' => 'a',
        'ы' => 'y',
        'ь' => '',
        'э' => 'e',
    ];

    /**
     * Latin letters carrying diacritics, including the ones used across the
     * region (sq, sr-Latn, hr, bs, ro, hu, de, tr).
     *
     * @var array<string, string>
     */
    private const DIACRITICS = [
        'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'ā' => 'a', 'ă' => 'a', 'ą' => 'a',
        'æ' => 'ae',
        'ç' => 'c', 'ć' => 'c', 'č' => 'c', 'ĉ' => 'c', 'ċ' => 'c',
        'ď' => 'd', 'đ' => 'dj', 'ð' => 'd',
        'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e', 'ē' => 'e', 'ĕ' => 'e', 'ė' => 'e', 'ę' => 'e', 'ě' => 'e',
        'ğ' => 'g', 'ĝ' => 'g', 'ġ' => 'g', 'ģ' => 'g',
        'ĥ' => 'h',
        'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i', 'ī' => 'i', 'į' => 'i', 'ı' => 'i',
        'ĵ' => 'j',
        'ķ' => 'k',
        'ĺ' => 'l', 'ļ' => 'l', 'ľ' => 'l', 'ł' => 'l',
        'ñ' => 'n', 'ń' => 'n', 'ņ' => 'n', 'ň' => 'n',
        'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ő' => 'o', 'ø' => 'o', 'ō' => 'o',
        'œ' => 'oe',
        'ŕ' => 'r', 'ř' => 'r',
        'ś' => 's', 'ş' => 's', 'š' => 's', 'ŝ' => 's', 'ș' => 's',
        'ß' => 'ss',
        'ţ' => 't', 'ť' => 't', 'ț' => 't',
        'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u', 'ū' => 'u', 'ŭ' => 'u', 'ů' => 'u', 'ű' => 'u', 'ų' => 'u',
        'ŵ' => 'w',
        'ý' => 'y', 'ÿ' => 'y', 'ŷ' => 'y',
        'ź' => 'z', 'ż' => 'z', 'ž' => 'z',
    ];

    /**
     * Normalize a single piece of text into its canonical searchable form.
     */
    public static function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value), 'UTF-8');

        $value = strtr($value, self::CYRILLIC);
        $value = strtr($value, self::DIACRITICS);

        // Anything that is not a plain latin letter or a digit becomes a space,
        // so punctuation never changes whether two spellings match.
        $value = (string) preg_replace('/[^a-z0-9]+/u', ' ', $value);

        // Collapse repeated letters only. Digits are left alone so that years,
        // engine sizes and numeric model names survive intact.
        $value = (string) preg_replace('/([a-z])\1+/', '$1', $value);

        $value = (string) preg_replace('/\s+/', ' ', $value);

        return trim($value);
    }

    /**
     * Normalize and split into unique tokens, useful for building the
     * searchable text of a record out of several fields.
     *
     * @param  array<int, string|null>  $parts
     */
    public static function normalizeParts(array $parts): string
    {
        $tokens = [];

        foreach ($parts as $part) {
            if ($part === null || $part === '') {
                continue;
            }

            foreach (explode(' ', self::normalize($part)) as $token) {
                if ($token !== '' && ! in_array($token, $tokens, true)) {
                    $tokens[] = $token;
                }
            }
        }

        return implode(' ', $tokens);
    }

    /**
     * True when two pieces of text are the same once normalized, regardless of
     * the script or diacritics they were written in.
     */
    public static function matches(string $a, string $b): bool
    {
        return self::normalize($a) === self::normalize($b);
    }
}
