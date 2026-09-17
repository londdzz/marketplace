<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messaging\StoreFavoriteRequest;
use App\Http\Resources\FavoriteResource;
use App\Models\Favorite;
use App\Models\Listing;
use App\Services\BlockService;
use App\Services\FavoriteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class FavoriteController extends Controller
{
    public function __construct(
        private readonly FavoriteService $favorites,
        private readonly BlockService $blocks,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $hidden = $this->blocks->hiddenFrom($request->user());

        $favorites = Favorite::query()
            ->where('user_id', $request->user()->getKey())
            ->when($hidden !== [], fn ($query) => $query->whereHas(
                'listing',
                fn ($listing) => $listing->whereNotIn('user_id', $hidden),
            ))
            ->with(['listing.photos', 'listing.make', 'listing.model', 'listing.city'])
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        return FavoriteResource::collection($favorites);
    }

    public function store(StoreFavoriteRequest $request): JsonResponse
    {
        $listing = Listing::query()->findOrFail($request->validated('listing_id'));

        $favorite = $this->favorites->add($request->user(), $listing);

        return FavoriteResource::make($favorite->load('listing.photos'))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request, Listing $listing): Response
    {
        $this->favorites->remove($request->user(), $listing);

        return response()->noContent();
    }
}
