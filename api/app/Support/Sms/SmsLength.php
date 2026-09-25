<?php

declare(strict_types=1);

namespace App\Support\Sms;

/**
 * How many SMS segments a message costs.
 *
 * A network charges per segment, not per message. A segment is 160 characters
 * while every character is in the GSM 03.38 alphabet, and 70 the moment one is
 * not — which any Cyrillic letter is, and so is Albanian's ë. So the Macedonian
 * sign-in code has 70 characters to live in, not 160, and going one over
 * doubles the price of every sign-in with nothing anywhere reporting it.
 *
 * Concatenated messages lose a few characters per segment to the header that
 * says how to reassemble them, which is why the multi-segment sizes are 153
 * and 67 rather than 160 and 70.
 */
final class SmsLength
{
    /** The GSM 03.38 basic set. Anything outside it forces the whole message to UCS-2. */
    private const GSM7 = '@£$¥èéùìòÇ'."\n".'Øø'."\r".'ÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?'
        .'¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

    /** These are in the alphabet but are sent as an escape plus the character, so they cost two. */
    private const GSM7_EXTENDED = '^{}\\[~]|€';

    public static function isGsm7(string $message): bool
    {
        foreach (mb_str_split($message) as $character) {
            if (! str_contains(self::GSM7, $character) && ! str_contains(self::GSM7_EXTENDED, $character)) {
                return false;
            }
        }

        return true;
    }

    public static function segments(string $message): int
    {
        $gsm7 = self::isGsm7($message);

        $length = mb_strlen($message);

        if ($gsm7) {
            foreach (mb_str_split($message) as $character) {
                if (str_contains(self::GSM7_EXTENDED, $character)) {
                    $length++;
                }
            }
        }

        [$single, $multi] = $gsm7 ? [160, 153] : [70, 67];

        return $length <= $single ? 1 : (int) ceil($length / $multi);
    }
}
