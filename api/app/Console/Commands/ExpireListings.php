<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ListingStatus;
use App\Models\Listing;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Takes live listings out of the results once their fortnight is up.
 *
 * Runs hourly, so a listing is never live for more than an hour past its time.
 */
class ExpireListings extends Command
{
    protected $signature = 'listings:expire';

    protected $description = 'Expire active listings whose active period has ended';

    public function handle(): int
    {
        $expired = Listing::query()
            ->where('status', ListingStatus::Active)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', Carbon::now())
            ->update(['status' => ListingStatus::Expired]);

        $this->info("Expired {$expired} listings.");

        return self::SUCCESS;
    }
}
