<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Listing;
use App\Observers\ListingObserver;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;

/**
 * Rebuilds the normalized searchable text for every listing.
 *
 * Needed after any change to TextNormalizer or to what goes into the searchable
 * text, since stored text and incoming queries have to be normalized the same
 * way for a search to find anything at all.
 */
class ReindexListings extends Command
{
    protected $signature = 'listings:reindex';

    protected $description = 'Rebuild the normalized search text of every listing';

    public function handle(ListingObserver $observer): int
    {
        $count = 0;

        Listing::withTrashed()
            ->chunkById(500, function (Collection $listings) use ($observer, &$count): void {
                foreach ($listings as $listing) {
                    $listing->forceFill(['search_text' => $observer->build($listing)])->saveQuietly();
                    $count++;
                }
            });

        $this->info("Reindexed {$count} listings.");

        return self::SUCCESS;
    }
}
