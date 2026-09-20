<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

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
     * @return array{collections: array<int, array{key: string, filters: array<string, mixed>, count: int}>, body_types: array<int, array{key: string, count: int}>}
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
     * @return array{collections: array<int, array{key: string, filters: array<string, mixed>, count: int}>, body_types: array<int, array{key: string, count: int}>}
     */
    private function measure(?User $viewer): array
    {
        /** @var array<string, array<string, mixed>> $defined */
        $defined = config('listings.collections');

        $collections = [];

        foreach ($defined as $key => $filters) {
            $count = $this->search->count($filters, $viewer);

            if ($count > 0) {
                $collections[] = ['key' => $key, 'filters' => $filters, 'count' => $count];
            }
        }

        // Busiest first: the shapes with the most to show are the ones worth
        // the width, and the order stops being arbitrary as the market grows.
        usort($collections, static fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        $bodyTypes = [];

        foreach ((array) config('listings.body_types') as $key) {
            $count = $this->search->count(['body_type' => $key], $viewer);

            if ($count > 0) {
                $bodyTypes[] = ['key' => (string) $key, 'count' => $count];
            }
        }

        usort($bodyTypes, static fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        return ['collections' => $collections, 'body_types' => $bodyTypes];
    }
}
