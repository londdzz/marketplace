<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\User;
use App\Services\BlockService;

/**
 * A listing is private to its seller until it is published. After that anyone
 * may read it, but only the seller may ever change it.
 */
class ListingPolicy
{
    public function __construct(private readonly BlockService $blocks) {}

    public function view(?User $user, Listing $listing): bool
    {
        // A block hides the car as well as the person. Opening a link to it
        // has to fail the same way search does, or blocking would only be a
        // filter on one screen.
        if ($user !== null && $listing->user !== null && $this->blocks->eitherWay($user, $listing->user)) {
            return false;
        }

        if ($listing->status === ListingStatus::Active) {
            return true;
        }

        return $user !== null && $this->owns($user, $listing);
    }

    public function create(User $user): bool
    {
        return ! $user->isBlocked();
    }

    public function update(User $user, Listing $listing): bool
    {
        return $this->owns($user, $listing)
            && $listing->status !== ListingStatus::Removed;
    }

    public function delete(User $user, Listing $listing): bool
    {
        return $this->owns($user, $listing);
    }

    /**
     * Adding, reordering and removing photos travels with the right to edit.
     */
    public function managePhotos(User $user, Listing $listing): bool
    {
        return $this->update($user, $listing);
    }

    /**
     * Publishing, renewing and marking sold, which phase 4 acts on.
     */
    public function publish(User $user, Listing $listing): bool
    {
        return $this->owns($user, $listing)
            && ! $user->isBlocked()
            && $listing->status !== ListingStatus::Removed;
    }

    private function owns(User $user, Listing $listing): bool
    {
        return $user->getKey() === $listing->user_id;
    }
}
