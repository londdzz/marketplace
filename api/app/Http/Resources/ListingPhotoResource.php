<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ListingPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin ListingPhoto
 */
class ListingPhotoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $disk = Storage::disk((string) config('filesystems.default'));

        return [
            'id' => $this->id,
            'url' => $disk->url($this->path),
            'thumb_url' => $disk->url($this->thumb_path),
            'position' => $this->position,
            'width' => $this->width,
            'height' => $this->height,
        ];
    }
}
