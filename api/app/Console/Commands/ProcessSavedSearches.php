<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Data\PushMessage;
use App\Models\SavedSearch;
use App\Services\ListingSearchService;
use App\Services\PushService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Tells buyers when something new matches a search they saved.
 *
 * Runs every quarter of an hour. Each saved search only ever looks at listings
 * published since it last ran, so nobody is told twice about the same car.
 */
class ProcessSavedSearches extends Command
{
    protected $signature = 'saved-searches:process';

    protected $description = 'Notify buyers about new listings matching their saved searches';

    public function handle(ListingSearchService $search, PushService $push): int
    {
        $notified = 0;

        SavedSearch::query()
            ->where('notify', true)
            ->with('user.deviceTokens')
            ->chunkById(200, function ($searches) use ($search, $push, &$notified): void {
                foreach ($searches as $savedSearch) {
                    $notified += $this->process($savedSearch, $search, $push);
                }
            });

        $this->info("Notified {$notified} saved searches.");

        return self::SUCCESS;
    }

    private function process(SavedSearch $savedSearch, ListingSearchService $search, PushService $push): int
    {
        $since = $savedSearch->last_notified_at ?? $savedSearch->created_at ?? Carbon::now()->subDay();
        $now = Carbon::now();

        // A half-open window, [since, now). The next run starts exactly where
        // this one stopped, so a listing published in the same second as the
        // marker is reported once rather than lost between two runs.
        $filters = array_merge($savedSearch->filters ?? [], [
            'published_from' => $since,
            'published_before' => $now,
        ]);

        // The owner is passed so a saved search never reports a car from
        // someone they have blocked.
        $matches = $search->search($filters, 1, $savedSearch->user);
        $count = $matches->total();

        // The marker moves whether or not anything matched, so the next run
        // only ever looks at what is genuinely new.
        $savedSearch->forceFill(['last_notified_at' => $now])->save();

        if ($count === 0 || $savedSearch->user === null) {
            return 0;
        }

        $push->toUser($savedSearch->user, new PushMessage(
            titleKey: 'push.saved_search.title',
            bodyKey: 'push.saved_search.body',
            bodyReplacements: [
                'count' => $count,
                'name' => $savedSearch->name ?? (string) __('push.saved_search.title', [], $savedSearch->user->preferred_language),
            ],
            data: ['type' => 'saved_search', 'saved_search_id' => (string) $savedSearch->id],
        ));

        return 1;
    }
}
