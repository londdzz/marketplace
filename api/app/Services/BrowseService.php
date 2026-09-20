<?php

declare(strict_types=1);

namespace App\Services;

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
    public function sections(?User $viewer = null): array
    {
        // A buyer who has blocked someone sees fewer cars than everyone else,
        // so their numbers cannot come out of the shared cache. Almost nobody
        // has blocked anyone, and they pay for it rather than the rest.
        if ($this->blocks->hiddenFrom($viewer) !== []) {
            return $this->measure($viewer);
        }

        return Cache::remember(
            'browse.sections',
            (int) config('listings.reference_cache_seconds'),
            fn (): array => $this->measure(null),
        );
    }

    /**
     * @return array{collections: array<int, array{key: string, filters: array<string, mixed>, count: int, photo: string|null}>, body_types: array<int, array{key: string, count: int, photo: string|null}>}
     */
    private function measure(?User $viewer): array
    {
        /** @var array<string, array<string, mixed>> $defined */
        $defined = config('listings.collections');

        // Every card that can show a different car does.
        $shown = [];
        $collections = [];

        foreach ($defined as $key => $filters) {
            $count = $this->search->count($filters, $viewer);

            if ($count > 0) {
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
        usort($collections, static fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        $bodyTypes = [];

        foreach ((array) config('listings.body_types') as $key) {
            $count = $this->search->count(['body_type' => $key], $viewer);

            if ($count > 0) {
                $bodyTypes[] = [
                    'key' => (string) $key,
                    'count' => $count,
                    'photo' => $this->faceOf(['body_type' => $key], $viewer, $shown),
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
