<?php

declare(strict_types=1);

namespace App\Http\Controllers\Listing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Listing\StoreListingRequest;
use App\Http\Requests\Listing\UpdateListingRequest;
use App\Http\Resources\ListingResource;
use App\Models\Listing;
use App\Services\ListingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ListingController extends Controller
{
    public function __construct(private readonly ListingService $listings) {}

    /**
     * A single listing. Active listings are public; a draft is visible only to
     * the seller who owns it.
     */
    public function show(Request $request, Listing $listing): JsonResponse
    {
        $this->authorize('view', $listing);

        $this->listings->recordView($listing, (string) $request->ip(), $request->user());

        $listing->load(['make', 'model', 'city', 'photos', 'user.city']);

        return ListingResource::make($listing)->response();
    }

    /**
     * Open a draft.
     */
    public function store(StoreListingRequest $request): JsonResponse
    {
        $this->authorize('create', Listing::class);

        $listing = $this->listings->createDraft($request->user(), $request->validated());

        return ListingResource::make($listing->load(['make', 'model', 'city', 'photos']))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateListingRequest $request, Listing $listing): JsonResponse
    {
        $this->authorize('update', $listing);

        $listing = $this->listings->update($listing, $request->validated());

        return ListingResource::make($listing->load(['make', 'model', 'city', 'photos']))
            ->response();
    }

    public function destroy(Listing $listing): Response
    {
        $this->authorize('delete', $listing);

        $this->listings->delete($listing);

        return response()->noContent();
    }
}
