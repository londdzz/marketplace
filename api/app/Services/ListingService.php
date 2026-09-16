<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Everything that changes a listing, other than its photos.
 *
 * Status is never accepted from a client. A listing leaves draft only through
 * the publishing methods, which spend a credit.
 */
final class ListingService
{
    /**
     * Open a draft. The sell flow saves after every step, so a draft may hold
     * nothing more than a make and a model to begin with.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function createDraft(User $user, array $attributes): Listing
    {
        $listing = new Listing($attributes);
        $listing->user_id = $user->getKey();
        $listing->status = ListingStatus::Draft;

        // Fall back to the seller's own location so a draft always has
        // somewhere to be, which the location step can then change.
        $listing->country_code ??= $user->country_code;
        $listing->city_id ??= $user->city_id;

        $listing->save();

        return $listing->refresh();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Listing $listing, array $attributes): Listing
    {
        $listing->fill($attributes)->save();

        return $listing->refresh();
    }

    /**
     * Take a listing down. The row is kept, soft-deleted, so the seller's
     * history and any conversation about it survive; a full account deletion
     * is what removes it for good.
     */
    public function delete(Listing $listing): void
    {
        $listing->forceFill(['status' => ListingStatus::Removed])->save();
        $listing->delete();
    }

    /**
     * Count a view at most once per IP address per day, so a refresh, a crawler
     * or a seller admiring their own listing cannot inflate it.
     */
    public function recordView(Listing $listing, string $ip, ?User $viewer = null): void
    {
        if ($viewer !== null && $viewer->getKey() === $listing->user_id) {
            return;
        }

        $key = sprintf('listing-view:%s:%s', $listing->getKey(), sha1($ip));
        $hours = (int) config('listings.view_throttle_hours');

        if (! Cache::add($key, true, now()->addHours($hours))) {
            return;
        }

        $listing->increment('view_count');
    }
}
