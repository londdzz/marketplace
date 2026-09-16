<?php

declare(strict_types=1);

namespace App\Http\Controllers\Listing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Listing\MyListingsRequest;
use App\Http\Resources\ListingResource;
use App\Models\Listing;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MyListingController extends Controller
{
    /**
     * The seller's own listings, newest first, optionally narrowed to one
     * status. Drafts are included, which is how the app resumes an unfinished
     * sell flow.
     */
    public function index(MyListingsRequest $request): AnonymousResourceCollection
    {
        $listings = Listing::query()
            ->where('user_id', $request->user()->getKey())
            ->when($request->status(), fn ($query, $status) => $query->where('status', $status))
            ->with(['make', 'model', 'city', 'photos'])
            ->withCount('photos')
            ->orderByDesc('created_at')
            ->paginate($request->perPage())
            ->withQueryString();

        return ListingResource::collection($listings);
    }
}
