<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\VehicleType;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * The ways into the catalogue that are not a search box.
 *
 * A buyer who does not yet know what they want has nothing to type, so the home
 * screen offers them the handful of things people actually come looking for —
 * a family car, a first car, something automatic — and the body shapes, each
 * with the number of cars behind it.
 *
 * Every number here is counted against live listings. Nothing is estimated and
 * nothing is rounded, and a collection or a shape with nothing in it is left
 * out rather than offered as an empty room.
 */
final class BrowseService
{
    public function __construct(
        private readonly ListingSearchService $search,
        private readonly BlockService $blocks,
    ) {}

    /**
     * Collections and body shapes, each with what is actually in it.
     *
     * @return array{collections: array<int, array{key: string, filters: array<string, mixed>, count: int, photo: string|null}>, body_types: array<int, array{key: string, count: int, photo: string|null}>}
     */
    public function sections(?User $viewer = null, ?VehicleType $type = null): array
    {
        $type ??= VehicleType::Car;

        // A buyer who has blocked someone sees fewer cars than everyone else,
        // so their numbers cannot come out of the shared cache. Almost nobody
        // has blocked anyone, and they pay for it rather than the rest.
        if ($this->blocks->hiddenFrom($viewer) !== []) {
            return $this->measure($viewer, $type);
        }

        return Cache::remember(
            'browse.sections.'.$type->value,
            (int) config('listings.reference_cache_seconds'),
            fn (): array => $this->measure(null, $type),
        );
    }

    /**
     * @return array{collections: array<int, array{key: string, filters: array<string, mixed>, count: int, photo: string|null}>, body_types: array<int, array{key: string, count: int, photo: string|null}>}
     */
    private function measure(?User $viewer, VehicleType $type): array
    {
        /** @var array<string, array<string, mixed>> $defined */
        $defined = (array) config('listings.collections.'.$type->value);

        // Every card that can show a different car does.
        $shown = [];
        $collections = [];

        // Normally a category with nothing behind it is not drawn: an empty
        // category is a worse tap than no category, and a count is a promise.
        //
        // A catalogue with no cars in it yet is the exception. Every category
        // then counts zero, both rails vanish, and the home screen reads as
        // broken rather than as empty — which is the wrong thing to hand a
        // tester on the first evening. So this can be turned on while a server
        // is being tried out, and it is off by default so launch keeps the
        // rule. The count shown is still the real one, and tapping through
        // still runs the real search; it simply arrives at an empty result,
        // which is a screen that already says what to do next.
        $showEmpty = (bool) config('listings.browse.show_empty');

        foreach ($defined as $key => $filters) {
            $filters['vehicle_type'] = $type->value;
            $count = $this->search->count($filters, $viewer);

            if ($count > 0 || $showEmpty) {
                $collections[] = [
                    'key' => $key,
                    'filters' => $filters,
                    'count' => $count,
                    'photo' => $this->faceOf($filters, $viewer, $shown),
                ];
            }
        }

        // Busiest first: the shapes with the most to show are the ones worth
        // the width, and the order stops being arbitrary as the market grows.
        // PHP's sort is stable, so categories tied on nothing — which is all
        // of them on an empty catalogue — keep the order config names them in.
        usort($collections, static fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        $bodyTypes = [];

        // The shapes worth a tile, which is a shorter list than the shapes
        // that exist: see config('listings.browse.body_types'). Anything not
        // named there is still sellable, still searchable and still on any
        // listing that carries it — it simply has no card on the rail.
        $wanted = (array) config('listings.browse.body_types.'.$type->value, []);
        $drawn = $wanted === []
            ? $type->bodyTypes()
            : array_values(array_intersect($type->bodyTypes(), $wanted));

        foreach ($drawn as $key) {
            $filters = ['vehicle_type' => $type->value, 'body_type' => $key];
            $count = $this->search->count($filters, $viewer);

            if ($count > 0 || $showEmpty) {
                $bodyTypes[] = [
                    'key' => (string) $key,
                    'count' => $count,
                    'photo' => $this->faceOf($filters, $viewer, $shown),
                ];
            }
        }

        usort($bodyTypes, static fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        return ['collections' => $collections, 'body_types' => $bodyTypes];
    }

    /**
     * The newest matching car's own photograph, or nothing.
     *
     * Nothing is a real answer: a category whose cars were all listed without
     * pictures gets no picture, rather than a borrowed one belonging to a car
     * that is not in it.
     *
     * @param  array<string, mixed>  $filters
     * @param  array<int, string>  $shown  cars already on a card, added to as
     *                                     each one takes its own
     */
    private function faceOf(array $filters, ?User $viewer, array &$shown): ?string
    {
        $listing = $this->search->sample($filters, $viewer, $shown);
        $photo = $listing?->photos->sortBy('position')->first();

        if ($photo === null) {
            return null;
        }

        $shown[] = $listing->id;

        return Storage::disk((string) config('filesystems.default'))->url($photo->thumb_path);
    }
}
