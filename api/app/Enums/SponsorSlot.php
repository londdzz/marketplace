<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where on the home screen a sponsor's artwork is drawn.
 *
 * A closed vocabulary rather than a free string, so a typo in the command that
 * adds one cannot quietly create a fourth place nothing renders.
 */
enum SponsorSlot: string
{
    /**
     * The wide card under the search bar.
     *
     * Shared with the card explaining how selling works, which is the only
     * place a new seller learns that listing costs a credit. A sponsor here
     * replaces it while the booking runs; with nothing booked the explainer
     * comes back, so the slot is never an empty box.
     */
    case Top = 'home_top';

    /**
     * The carousel below the first cars: one card at a time, swiped sideways,
     * advancing on its own. Under the cars rather than above them, because
     * somebody opening a marketplace should see a car first.
     */
    case Feed = 'home_feed';

    /** The row of logos at the foot of the screen. Presence, not a headline. */
    case Partners = 'home_partners';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $slot): string => $slot->value, self::cases());
    }

    /**
     * How many are worth drawing in one slot.
     *
     * The wide card is one card, so more than one there is a rotation nobody
     * asked for. The carousel is worth swiping at two and a chore at more than
     * six. The logo strip is four across a phone.
     */
    public function limit(): int
    {
        return match ($this) {
            self::Top => 1,
            self::Feed => 6,
            self::Partners => 8,
        };
    }
}
