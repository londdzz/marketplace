<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Favorite;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Support\Carbon;

final class FavoriteService
{
    /**
     * Saving a listing twice is the same as saving it once.
     */
    public function add(User $user, Listing $listing): Favorite
    {
        $existing = Favorite::query()
            ->where('user_id', $user->getKey())
            ->where('listing_id', $listing->getKey())
            ->first();

        if ($existing instanceof Favorite) {
            return $existing;
        }

        return Favorite::query()->create([
            'user_id' => $user->getKey(),
            'listing_id' => $listing->getKey(),
            'created_at' => Carbon::now(),
        ]);
    }

    public function remove(User $user, Listing $listing): void
    {
        Favorite::query()
            ->where('user_id', $user->getKey())
            ->where('listing_id', $listing->getKey())
            ->delete();
    }
}
