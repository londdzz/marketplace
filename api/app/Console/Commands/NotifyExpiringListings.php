<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Data\PushMessage;
use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Services\PushService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Warns sellers whose listings run out within two days, so renewing is a
 * decision rather than something they discover after the fact.
 *
 * Runs once a day; a listing is only ever warned about once because the window
 * it looks at moves past it.
 */
class NotifyExpiringListings extends Command
{
    protected $signature = 'listings:notify-expiring {--hours=48}';

    protected $description = 'Tell sellers about listings that expire soon';

    public function handle(PushService $push): int
    {
        $hours = (int) $this->option('hours');
        $now = Carbon::now();
        $until = $now->copy()->addHours($hours);

        // Only the window between the last run and this one, so a listing is
        // not warned about again tomorrow.
        $from = $until->copy()->subDay();

        $notified = 0;

        Listing::query()
            ->where('status', ListingStatus::Active)
            ->whereNotNull('expires_at')
            ->whereBetween('expires_at', [max($now, $from), $until])
            ->with(['user.deviceTokens', 'make', 'model'])
            ->chunkById(200, function ($listings) use ($push, $now, &$notified): void {
                foreach ($listings as $listing) {
                    if ($listing->user === null) {
                        continue;
                    }

                    $push->toUser($listing->user, new PushMessage(
                        titleKey: 'push.listing_expiring.title',
                        bodyKey: 'push.listing_expiring.body',
                        bodyReplacements: [
                            'listing' => $this->title($listing),
                            'hours' => (int) round($now->diffInHours($listing->expires_at, false)),
                        ],
                        data: ['type' => 'listing_expiring', 'listing_id' => (string) $listing->id],
                    ));

                    $notified++;
                }
            });

        $this->info("Notified {$notified} sellers.");

        return self::SUCCESS;
    }

    private function title(Listing $listing): string
    {
        return trim(implode(' ', array_filter([
            $listing->make?->name,
            $listing->model?->name,
            $listing->year === null ? null : (string) $listing->year,
        ])));
    }
}
