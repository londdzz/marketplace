<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\TooManyPhotosException;
use App\Models\Listing;
use App\Models\ListingPhoto;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Photo storage for listings.
 *
 * The app resizes before uploading to save the seller's data, but nothing about
 * an upload is trusted: every image is re-encoded here to a capped long edge
 * with a thumbnail beside it, which also strips whatever metadata the phone
 * attached, location included.
 */
final class ListingPhotoService
{
    /**
     * Store a batch of uploads against a listing, appending to whatever is
     * already there.
     *
     * @param  array<int, UploadedFile>  $files
     * @return Collection<int, ListingPhoto>
     *
     * @throws TooManyPhotosException
     */
    public function store(Listing $listing, array $files): Collection
    {
        $limit = (int) config('listings.photos.max_per_listing');
        $existing = $listing->photos()->count();

        if ($existing + count($files) > $limit) {
            throw new TooManyPhotosException($limit);
        }

        $position = (int) $listing->photos()->max('position');
        $position = $existing === 0 ? -1 : $position;

        $stored = new Collection;

        foreach ($files as $file) {
            $stored->push($this->storeOne($listing, $file, ++$position));
        }

        return $stored;
    }

    /**
     * Remove one photo and its files, then close the gap it leaves in the
     * ordering.
     */
    public function delete(ListingPhoto $photo): void
    {
        $listing = $photo->listing;

        $this->disk()->delete(array_filter([$photo->path, $photo->thumb_path]));

        $photo->delete();

        $this->resequence($listing);
    }

    /**
     * Put the photos in the order the seller dragged them into. The first one
     * is the listing's cover.
     *
     * @param  array<int, string>  $photoIds
     * @return Collection<int, ListingPhoto>
     */
    public function reorder(Listing $listing, array $photoIds): Collection
    {
        DB::transaction(function () use ($listing, $photoIds): void {
            foreach (array_values($photoIds) as $position => $id) {
                $listing->photos()
                    ->whereKey($id)
                    ->update(['position' => $position]);
            }
        });

        return $listing->photos()->get();
    }

    private function storeOne(Listing $listing, UploadedFile $file, int $position): ListingPhoto
    {
        $manager = new ImageManager(new Driver);
        $image = $manager->read($file->getRealPath());

        // Phones record orientation in EXIF rather than in the pixels.
        $image->orient();

        $directory = sprintf('%s/%s', config('listings.photos.directory'), $listing->getKey());
        $name = (string) Str::uuid();
        $quality = (int) config('listings.photos.quality');

        $full = clone $image;
        $full->scaleDown(
            width: (int) config('listings.photos.full_long_edge'),
            height: (int) config('listings.photos.full_long_edge'),
        );

        $thumb = clone $image;
        $thumb->scaleDown(
            width: (int) config('listings.photos.thumb_long_edge'),
            height: (int) config('listings.photos.thumb_long_edge'),
        );

        $path = sprintf('%s/%s.jpg', $directory, $name);
        $thumbPath = sprintf('%s/%s_thumb.jpg', $directory, $name);

        $this->disk()->put($path, (string) $full->toJpeg($quality));
        $this->disk()->put($thumbPath, (string) $thumb->toJpeg($quality));

        return $listing->photos()->create([
            'path' => $path,
            'thumb_path' => $thumbPath,
            'position' => $position,
            'width' => $full->width(),
            'height' => $full->height(),
        ]);
    }

    /**
     * Renumber from zero with no gaps, keeping the order that is already there.
     */
    private function resequence(Listing $listing): void
    {
        $listing->photos()
            ->orderBy('position')
            ->orderBy('created_at')
            ->get()
            ->each(function (ListingPhoto $photo, int $index): void {
                if ($photo->position !== $index) {
                    $photo->forceFill(['position' => $index])->save();
                }
            });
    }

    private function disk(): Filesystem
    {
        return Storage::disk((string) config('filesystems.default'));
    }
}
