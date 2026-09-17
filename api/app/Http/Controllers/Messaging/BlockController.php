<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messaging\StoreBlockRequest;
use App\Http\Resources\BlockedUserResource;
use App\Models\User;
use App\Services\BlockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class BlockController extends Controller
{
    public function __construct(private readonly BlockService $blocks) {}

    /**
     * Who this account has blocked, so it can be undone.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return BlockedUserResource::collection($this->blocks->blockedBy($request->user()));
    }

    public function store(StoreBlockRequest $request): JsonResponse
    {
        $this->blocks->block($request->user(), $request->target());

        return BlockedUserResource::make($request->target())
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request, User $user): Response
    {
        $this->blocks->unblock($request->user(), $user);

        return response()->noContent();
    }
}
