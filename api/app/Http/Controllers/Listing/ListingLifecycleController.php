<?php

declare(strict_types=1);

namespace App\Http\Controllers\Listing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Listing\PromoteListingRequest;
use App\Http\Resources\ListingResource;
use App\Http\Resources\PromotionOptionsResource;
use App\Models\Listing;
use App\Services\ListingService;
use App\Services\PromotionBenchmark;
use Illuminate\Http\JsonResponse;

/**
 * The transitions that change what a listing is, rather than what it says.
 * Publishing and renewing each spend a credit.
 */
class ListingLifecycleController extends Controller
{
    public function __construct(
        private readonly ListingService $listings,
        private readonly PromotionBenchmark $benchmark,
    ) {}

    public function publish(Listing $listing): JsonResponse
    {
        $this->authorize('publish', $listing);

        $listing = $this->listings->publish($listing);

        return ListingResource::make($listing->load(['make', 'model', 'city', 'photos']))->response();
    }

    public function renew(Listing $listing): JsonResponse
    {
        $this->authorize('publish', $listing);

        $listing = $this->listings->renew($listing);

        return ListingResource::make($listing->load(['make', 'model', 'city', 'photos']))->response();
    }

    /**
     * What a promotion would cost and buy, before the seller commits to one.
     */
    public function promotionOptions(Listing $listing): JsonResponse
    {
        $this->authorize('publish', $listing);

        return PromotionOptionsResource::make([
            'days_per_credit' => (int) config('credits.promote.days_per_credit'),
            'min_credits' => (int) config('credits.promote.min_credits'),
            'max_credits' => (int) config('credits.promote.max_credits'),
            'balance' => (int) $listing->user->credits,
            'featured_until' => $listing->featured_until?->toIso8601String(),
            'typical' => $this->benchmark->typical(),
        ])->response();
    }

    public function promote(PromoteListingRequest $request, Listing $listing): JsonResponse
    {
        $this->authorize('publish', $listing);

        $listing = $this->listings->promote($listing, $request->credits());

        return ListingResource::make($listing->load(['make', 'model', 'city', 'photos']))->response();
    }

    public function markSold(Listing $listing): JsonResponse
    {
        $this->authorize('update', $listing);

        $listing = $this->listings->markSold($listing);

        return ListingResource::make($listing->load(['make', 'model', 'city', 'photos']))->response();
    }
}
