<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SponsorSlot;
use App\Enums\VehicleType;
use App\Models\Sponsor;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * What is booked, per slot, for the catalogue being browsed.
 *
 * Cached like the reference data, because it changes when somebody sells a
 * booking rather than when somebody uses the app, and every launch asks for
 * it. Adding or removing one clears it, so a sponsor who paid this morning is
 * on screen this morning.
 */
class SponsorService
{
    /** Long enough to be worth caching, short enough that a booking that ends at noon is gone by one. */
    private const TTL_MINUTES = 30;

    /**
     * Every slot at once, keyed by slot.
     *
     * One answer rather than three requests: the home screen needs all of
     * them and a launch is already paying for the reference data.
     *
     * @return array<string, Collection<int, Sponsor>>
     */
    public function forHome(VehicleType $type): array
    {
        return Cache::remember(
            self::cacheKey($type),
            now()->addMinutes(self::TTL_MINUTES),
            function () use ($type): array {
                $booked = Sponsor::query()
                    ->live()
                    ->for($type)
                    ->orderBy('position')
                    ->orderBy('id')
                    ->get()
                    ->groupBy(fn (Sponsor $sponsor): string => $sponsor->slot->value);

                $slots = [];

                foreach (SponsorSlot::cases() as $slot) {
                    // Taking the slot's own limit here rather than in the
                    // client means a seventh carousel card is never sent and
                    // then silently dropped by whoever drew it.
                    $slots[$slot->value] = ($booked->get($slot->value) ?? collect())
                        ->take($slot->limit())
                        ->values();
                }

                return $slots;
            },
        );
    }

    /** Both catalogues, since a booking can belong to either or to both. */
    public static function forget(): void
    {
        foreach (VehicleType::cases() as $type) {
            Cache::forget(self::cacheKey($type));
        }
    }

    private static function cacheKey(VehicleType $type): string
    {
        return 'sponsors.home.'.$type->value;
    }
}
