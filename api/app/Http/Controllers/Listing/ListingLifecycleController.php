<?php

declare(strict_types=1);

namespace App\Http\Controllers\Listing;

use App\Http\Controllers\Controller;
use App\Http\Resources\ListingResource;
use App\Models\Listing;
use App\Services\ListingService;
use Illuminate\Http\JsonResponse;

/**
 * The transitions that change what a listing is, rather than what it says.
 * Publishing and renewing each spend a credit.
 */
class ListingLifecycleController extends Controller
{
    public function __construct(private readonly ListingService $listings) {}

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

    public function markSold(Listing $listing): JsonResponse
    {
        $this->authorize('update', $listing);

        $listing = $this->listings->markSold($listing);

        return ListingResource::make($listing->load(['make', 'model', 'city', 'photos']))->response();
    }
}
