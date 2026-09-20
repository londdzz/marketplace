<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ListingStatus;
use App\Models\City;
use App\Models\Listing;
use App\Models\User;
use App\Support\TextNormalizer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * One search across all five markets.
 *
 * The query the buyer types is normalized exactly the way listing text was
 * normalized when it was saved, so "Пасат", "Passat" and "pasat" are the same
 * search. Results are always live listings, featured ones first.
 */
final class ListingSearchService
{
    public function __construct(private readonly BlockService $blocks) {}

    /**
     * @param  array<string, mixed>  $filters
     * @param  User|null  $viewer  whoever is searching, when they are signed in:
     *                             blocking hides listings in both directions
     * @return LengthAwarePaginator<int, Listing>
     */
    public function search(array $filters, int $perPage = 20, ?User $viewer = null): LengthAwarePaginator
    {
        $query = Listing::query()
            ->where('status', ListingStatus::Active)
            // The seller comes with the results: a results list names who is
            // selling and lets a buyer call them without opening the car first.
            ->with(['make', 'model', 'city', 'photos', 'user.city'])
            ->withCount('photos');

        // Used by the saved-search job to ask for one half-open window of time,
        // [from, before). Consecutive windows then abut exactly, so no listing
        // can fall between two runs and none is ever reported twice, even
        // though published_at only has one-second resolution. Never exposed as
        // a request filter.
        if (isset($filters['published_from'])) {
            $query->where('published_at', '>=', $filters['published_from']);
        }

        if (isset($filters['published_before'])) {
            $query->where('published_at', '<', $filters['published_before']);
        }

        // Someone I blocked, and anyone who blocked me, drops out of every
        // search. Nothing is deleted; unblocking brings it all back.
        $hidden = $this->blocks->hiddenFrom($viewer);

        if ($hidden !== []) {
            $query->whereNotIn('user_id', $hidden);
        }

        $this->applyText($query, $filters['q'] ?? null);
        $this->applyVehicle($query, $filters);
        $this->applyPlace($query, $filters);
        $this->applySort($query, $filters['sort'] ?? 'relevance', $filters['q'] ?? null);

        return $query->paginate($perPage)->withQueryString();
    }

    /**
     * One live listing that matches, newest first, and only if it has a
     * photograph.
     *
     * The home screen puts a face on each of its categories, and the honest
     * face for "family cars" is a family car actually for sale here — not a
     * studio render of a car nobody can buy. It changes as the catalogue
     * changes and costs nothing to licence, because the seller took it.
     *
     * @param  array<string, mixed>  $filters
     * @param  array<int, string>  $exclude  cars already showing on another
     *                                       card, so a rail of categories is
     *                                       not the same photograph six times
     */
    public function sample(array $filters, ?User $viewer = null, array $exclude = []): ?Listing
    {
        $query = Listing::query()
            ->where('status', ListingStatus::Active)
            ->with('photos')
            ->has('photos');

        $hidden = $this->blocks->hiddenFrom($viewer);

        if ($hidden !== []) {
            $query->whereNotIn('user_id', $hidden);
        }

        $this->applyVehicle($query, $filters);
        $this->applyPlace($query, $filters);
        $query->orderByDesc('published_at');

        if ($exclude === []) {
            return $query->first();
        }

        // A car of its own if there is one; otherwise a repeat beats a blank.
        return (clone $query)->whereNotIn('id', $exclude)->first() ?? $query->first();
    }

    /**
     * How many live listings a set of filters would return.
     *
     * The home screen puts a number under every category it offers, and a
     * number that was estimated is a number that is wrong. This runs the same
     * filters against the same listings the search itself would, minus the
     * ordering and the eager loads, which count for nothing when counting.
     *
     * @param  array<string, mixed>  $filters
     */
    public function count(array $filters, ?User $viewer = null): int
    {
        $query = Listing::query()->where('status', ListingStatus::Active);

        $hidden = $this->blocks->hiddenFrom($viewer);

        if ($hidden !== []) {
            $query->whereNotIn('user_id', $hidden);
        }

        $this->applyText($query, $filters['q'] ?? null);
        $this->applyVehicle($query, $filters);
        $this->applyPlace($query, $filters);

        return $query->count();
    }

    /**
     * @param  Builder<Listing>  $query
     */
    private function applyText(Builder $query, ?string $q): void
    {
        $tokens = $this->tokens($q);

        if ($tokens === []) {
            return;
        }

        $minimum = (int) config('listings.search.min_token_size');

        $indexable = array_values(array_filter($tokens, static fn (string $t): bool => strlen($t) >= $minimum));
        $short = array_values(array_filter($tokens, static fn (string $t): bool => strlen($t) < $minimum));

        $query->where(function (Builder $query) use ($indexable, $short): void {
            if ($indexable !== []) {
                $query->whereFullText('search_text', $this->booleanExpression($indexable), ['mode' => 'boolean']);
            }

            // Words the fulltext index will not hold, which is most short model
            // names, still have to narrow the results.
            foreach ($short as $token) {
                $query->where('search_text', 'like', '%'.$token.'%');
            }
        });
    }

    /**
     * @param  Builder<Listing>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyVehicle(Builder $query, array $filters): void
    {
        $query
            ->when($filters['make_id'] ?? null, fn (Builder $q, $id) => $q->where('make_id', $id))
            ->when($filters['model_id'] ?? null, fn (Builder $q, $id) => $q->where('model_id', $id))
            ->when($filters['year_min'] ?? null, fn (Builder $q, $year) => $q->where('year', '>=', $year))
            ->when($filters['year_max'] ?? null, fn (Builder $q, $year) => $q->where('year', '<=', $year))
            ->when($filters['price_min'] ?? null, fn (Builder $q, $price) => $q->where('price_eur', '>=', $price))
            ->when($filters['price_max'] ?? null, fn (Builder $q, $price) => $q->where('price_eur', '<=', $price))
            ->when($filters['mileage_max'] ?? null, fn (Builder $q, $km) => $q->where('mileage_km', '<=', $km))
            ->when($filters['transmission'] ?? null, fn (Builder $q, $t) => $q->where('transmission', $t))
            ->when($filters['body_type'] ?? null, fn (Builder $q, $b) => $q->where('body_type', $b));

        $fuel = array_filter((array) ($filters['fuel'] ?? []));

        if ($fuel !== []) {
            $query->whereIn('fuel', $fuel);
        }
    }

    /**
     * @param  Builder<Listing>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyPlace(Builder $query, array $filters): void
    {
        $countries = array_filter((array) ($filters['countries'] ?? []));

        if ($countries !== []) {
            $query->whereIn('country_code', $countries);
        }

        $radius = $filters['radius_km'] ?? null;

        if ($radius === null) {
            $query->when($filters['city_id'] ?? null, fn (Builder $q, $id) => $q->where('city_id', $id));

            return;
        }

        [$latitude, $longitude] = $this->origin($filters);

        if ($latitude === null || $longitude === null) {
            return;
        }

        // Great-circle distance in kilometres. A bounding box first so the rows
        // that cannot possibly match are cut before any trigonometry runs.
        $latDelta = (float) $radius / 111.0;
        $lngDelta = (float) $radius / max(1.0, 111.0 * cos(deg2rad((float) $latitude)));

        $query
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereBetween('latitude', [$latitude - $latDelta, $latitude + $latDelta])
            ->whereBetween('longitude', [$longitude - $lngDelta, $longitude + $lngDelta])
            ->whereRaw(
                '(6371 * acos(least(1, greatest(-1, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))))) <= ?',
                [$latitude, $longitude, $latitude, $radius],
            );
    }

    /**
     * Where to measure a radius from: the coordinates given, or the chosen
     * city's own.
     *
     * @param  array<string, mixed>  $filters
     * @return array{0: float|null, 1: float|null}
     */
    private function origin(array $filters): array
    {
        if (isset($filters['lat'], $filters['lng'])) {
            return [(float) $filters['lat'], (float) $filters['lng']];
        }

        $city = isset($filters['city_id'])
            ? City::query()->find($filters['city_id'])
            : null;

        if ($city instanceof City) {
            return [(float) $city->latitude, (float) $city->longitude];
        }

        return [null, null];
    }

    /**
     * Featured listings lead every ordering, which is what being featured buys.
     * After that the requested order applies, with the most recently bumped
     * listing first when nothing else separates two cars.
     *
     * @param  Builder<Listing>  $query
     */
    private function applySort(Builder $query, string $sort, ?string $q): void
    {
        $query->orderByRaw('CASE WHEN featured_until IS NOT NULL AND featured_until > ? THEN 0 ELSE 1 END', [now()]);

        match ($sort) {
            'price_asc' => $query->orderBy('price_eur'),
            'price_desc' => $query->orderByDesc('price_eur'),
            'newest' => $query->orderByDesc('published_at'),
            'mileage_asc' => $query->orderBy('mileage_km'),
            default => $this->applyRelevance($query, $q),
        };

        $query->orderByDesc('bumped_at')->orderByDesc('id');
    }

    /**
     * @param  Builder<Listing>  $query
     */
    private function applyRelevance(Builder $query, ?string $q): void
    {
        $tokens = array_values(array_filter(
            $this->tokens($q),
            fn (string $token): bool => strlen($token) >= (int) config('listings.search.min_token_size'),
        ));

        if ($tokens === []) {
            return;
        }

        $query->orderByRaw(
            'MATCH (search_text) AGAINST (? IN BOOLEAN MODE) DESC',
            [$this->booleanExpression($tokens)],
        );
    }

    /**
     * Every word has to appear, and the last one may still be being typed.
     *
     * @param  array<int, string>  $tokens
     */
    private function booleanExpression(array $tokens): string
    {
        $last = array_key_last($tokens);

        return implode(' ', array_map(
            static fn (string $token, int|string $index): string => $index === $last
                ? '+'.$token.'*'
                : '+'.$token,
            $tokens,
            array_keys($tokens),
        ));
    }

    /**
     * @return array<int, string>
     */
    private function tokens(?string $q): array
    {
        if ($q === null || trim($q) === '') {
            return [];
        }

        $normalized = TextNormalizer::normalize($q);

        if ($normalized === '') {
            return [];
        }

        return array_slice(
            array_values(array_unique(explode(' ', $normalized))),
            0,
            (int) config('listings.search.max_tokens'),
        );
    }
}
