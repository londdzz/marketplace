<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CreditReason;
use App\Enums\ListingStatus;
use App\Exceptions\InsufficientCreditsException;
use App\Exceptions\ListingNotReadyException;
use App\Exceptions\ListingStatusException;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Everything that changes a listing, other than its photos.
 *
 * Status is never accepted from a client. A listing leaves draft only through
 * the publishing methods, which spend a credit.
 */
final class ListingService
{
    /**
     * What a listing must have before a buyer ever sees it.
     *
     * @var array<int, string>
     */
    private const REQUIRED_TO_PUBLISH = [
        'make_id',
        'model_id',
        'year',
        'mileage_km',
        'fuel',
        'transmission',
        'price_eur',
        'country_code',
        'city_id',
    ];

    public function __construct(private readonly CreditService $credits) {}

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
     * Put a listing live by spending a credit.
     *
     * The spend and the status change share one transaction, so a listing can
     * never go live without being paid for and a credit can never be taken
     * without the listing going live.
     *
     * @throws ListingNotReadyException|ListingStatusException|InsufficientCreditsException
     */
    public function publish(Listing $listing): Listing
    {
        if (! in_array($listing->status, [ListingStatus::Draft, ListingStatus::PendingPayment, ListingStatus::Expired], true)) {
            throw new ListingStatusException('listing.publish.wrong_status');
        }

        $missing = $this->missingForPublish($listing);

        if ($missing !== []) {
            throw new ListingNotReadyException($missing);
        }

        return DB::transaction(function () use ($listing): Listing {
            $this->credits->spend(
                $listing->user,
                (int) config('credits.publish_cost'),
                CreditReason::ListingPublish,
                $listing,
            );

            $now = Carbon::now();

            $listing->forceFill([
                'status' => ListingStatus::Active,
                'published_at' => $listing->published_at ?? $now,
                'bumped_at' => $now,
                'expires_at' => $now->copy()->addDays((int) config('listings.active_days')),
            ])->save();

            return $listing->refresh();
        });
    }

    /**
     * Buy another active period for a listing that is live or has just run out,
     * and bump it back to the top of the results.
     *
     * @throws ListingStatusException|InsufficientCreditsException
     */
    public function renew(Listing $listing): Listing
    {
        if (! in_array($listing->status, [ListingStatus::Active, ListingStatus::Expired], true)) {
            throw new ListingStatusException('listing.renew.wrong_status');
        }

        return DB::transaction(function () use ($listing): Listing {
            $this->credits->spend(
                $listing->user,
                (int) config('credits.renew_cost'),
                CreditReason::Renewal,
                $listing,
            );

            $now = Carbon::now();
            $days = (int) config('listings.active_days');

            // Time still left is kept rather than thrown away, so renewing
            // early is never a punishment.
            $from = $listing->expires_at !== null && $listing->expires_at->isFuture()
                ? $listing->expires_at->copy()
                : $now->copy();

            $listing->forceFill([
                'status' => ListingStatus::Active,
                'published_at' => $listing->published_at ?? $now,
                'bumped_at' => $now,
                'expires_at' => $from->addDays($days),
            ])->save();

            return $listing->refresh();
        });
    }

    /**
     * The car is gone. No credit is spent and none is given back.
     *
     * @throws ListingStatusException
     */
    public function markSold(Listing $listing): Listing
    {
        if (! in_array($listing->status, [ListingStatus::Active, ListingStatus::Expired], true)) {
            throw new ListingStatusException('listing.sold.wrong_status');
        }

        $listing->forceFill(['status' => ListingStatus::Sold])->save();

        return $listing->refresh();
    }

    /**
     * The fields a listing still needs before it can be published, including
     * the minimum number of photos.
     *
     * @return array<int, string>
     */
    public function missingForPublish(Listing $listing): array
    {
        $missing = [];

        foreach (self::REQUIRED_TO_PUBLISH as $field) {
            if ($listing->{$field} === null) {
                $missing[] = $field;
            }
        }

        if ($listing->photos()->count() < (int) config('listings.photos.min_to_publish')) {
            $missing[] = 'photos';
        }

        return $missing;
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
