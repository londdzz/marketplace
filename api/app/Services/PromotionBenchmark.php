<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CreditReason;
use App\Models\CreditTransaction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * What other sellers actually spend on a promotion.
 *
 * A seller choosing a budget has nothing to judge it against, so this reads
 * the ledger and answers with the range the middle half of promotions fall
 * in. It is measured, never estimated: if too few sellers have promoted
 * anything, there is nothing honest to say and it says nothing rather than
 * inventing a number to fill the space.
 */
final class PromotionBenchmark
{
    /**
     * The middle of the market, or null while it is too small to describe.
     *
     * @return array{low: int, high: int, median: int, sample: int}|null
     */
    public function typical(): ?array
    {
        return Cache::remember('promotions.benchmark', now()->addMinutes(15), function (): ?array {
            $minimum = (int) config('credits.promote.benchmark_min_sample');

            /** @var array<int, int> $spends */
            $spends = CreditTransaction::query()
                ->where('reason', CreditReason::Feature)
                ->where('created_at', '>=', Carbon::now()->subDays((int) config('credits.promote.benchmark_days')))
                ->pluck('delta')
                ->map(static fn (int $delta): int => abs($delta))
                ->filter(static fn (int $credits): bool => $credits > 0)
                ->sort()
                ->values()
                ->all();

            $sample = count($spends);

            if ($sample < $minimum) {
                return null;
            }

            return [
                'low' => $this->quantile($spends, 0.25),
                'high' => $this->quantile($spends, 0.75),
                'median' => $this->quantile($spends, 0.5),
                'sample' => $sample,
            ];
        });
    }

    /**
     * The value at a position in a sorted list, rounded to a whole credit
     * because that is the only amount anyone can actually spend.
     *
     * @param  array<int, int>  $sorted
     */
    private function quantile(array $sorted, float $at): int
    {
        $index = (int) round($at * (count($sorted) - 1));

        return $sorted[$index];
    }
}
