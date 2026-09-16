<?php

declare(strict_types=1);

namespace App\Http\Controllers\Listing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Listing\SearchListingsRequest;
use App\Http\Resources\ListingResource;
use App\Services\ListingSearchService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * One search covering all five markets. Public: a buyer never has to sign in to
 * look.
 */
class ListingSearchController extends Controller
{
    public function __construct(private readonly ListingSearchService $search) {}

    public function __invoke(SearchListingsRequest $request): AnonymousResourceCollection
    {
        $results = $this->search->search($request->filters(), $request->perPage());

        return ListingResource::collection($results);
    }
}
