<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Listing;
use App\Models\ListingPhoto;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Deletes an account for good, which is what the App Store requires of any app
 * that lets people create one.
 *
 * Everything the account owns goes with it: listings including soft-deleted
 * ones, their photo files, conversations on either side, messages, favorites,
 * saved searches, device tokens, the credit ledger, reports filed, blocks in
 * both directions, and every API token. Nothing is kept for later.
 */
final class AccountDeletionService
{
    public function delete(User $user): void
    {
        $photoPaths = $this->photoPaths($user);

        DB::transaction(function () use ($user): void {
            // Sanctum tokens hang off a polymorphic relation, so no foreign key
            // cascade reaches them.
            $user->tokens()->delete();

            // Codes are keyed by phone number, not by user.
            if ($user->phone !== null) {
                OtpCode::query()->where('phone', $user->phone)->delete();
            }

            // Every other table cascades from users on delete.
            $user->delete();
        });

        if ($photoPaths !== []) {
            Storage::disk(config('filesystems.default'))->delete($photoPaths);
        }
    }

    /**
     * @return array<int, string>
     */
    private function photoPaths(User $user): array
    {
        $listingIds = Listing::query()
            ->withTrashed()
            ->where('user_id', $user->getKey())
            ->pluck('id');

        if ($listingIds->isEmpty()) {
            return [];
        }

        return ListingPhoto::query()
            ->whereIn('listing_id', $listingIds)
            ->get(['path', 'thumb_path'])
            ->flatMap(static fn (ListingPhoto $photo): array => [$photo->path, $photo->thumb_path])
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
