<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messaging\StoreSavedSearchRequest;
use App\Http\Resources\SavedSearchResource;
use App\Models\SavedSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class SavedSearchController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $searches = SavedSearch::query()
            ->where('user_id', $request->user()->getKey())
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        return SavedSearchResource::collection($searches);
    }

    public function store(StoreSavedSearchRequest $request): JsonResponse
    {
        $savedSearch = SavedSearch::query()->create([
            'user_id' => $request->user()->getKey(),
            'name' => $request->validated('name'),
            'filters' => $request->filters(),
            'notify' => (bool) ($request->validated('notify') ?? true),
        ]);

        return SavedSearchResource::make($savedSearch)->response()->setStatusCode(201);
    }

    public function destroy(SavedSearch $savedSearch): Response
    {
        $this->authorize('delete', $savedSearch);

        $savedSearch->delete();

        return response()->noContent();
    }
}
