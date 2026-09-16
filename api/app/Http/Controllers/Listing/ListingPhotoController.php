<?php

declare(strict_types=1);

namespace App\Http\Controllers\Listing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Listing\ReorderPhotosRequest;
use App\Http\Requests\Listing\UploadPhotosRequest;
use App\Http\Resources\ListingPhotoResource;
use App\Models\Listing;
use App\Models\ListingPhoto;
use App\Services\ListingPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ListingPhotoController extends Controller
{
    public function __construct(private readonly ListingPhotoService $photos) {}

    public function store(UploadPhotosRequest $request, Listing $listing): JsonResponse
    {
        $this->authorize('managePhotos', $listing);

        $this->photos->store($listing, $request->photos());

        return ListingPhotoResource::collection($listing->photos()->get())
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Listing $listing, ListingPhoto $photo): Response
    {
        $this->authorize('managePhotos', $listing);

        // Route model binding resolves the photo on its own, so the listing it
        // belongs to still has to be checked.
        if ($photo->listing_id !== $listing->getKey()) {
            throw new NotFoundHttpException;
        }

        $this->photos->delete($photo);

        return response()->noContent();
    }

    public function order(ReorderPhotosRequest $request, Listing $listing): AnonymousResourceCollection
    {
        $this->authorize('managePhotos', $listing);

        return ListingPhotoResource::collection(
            $this->photos->reorder($listing, $request->photoIds())
        );
    }
}
