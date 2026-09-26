<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Sponsor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Sponsor
 */
class SponsorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // The sponsor's own name, for the label beside the artwork. Not
            // the advertisement's copy — that is inside the picture.
            'name' => $this->name,
            'image_url' => Storage::disk((string) config('filesystems.default'))->url($this->image_path),
            'alt' => $this->alt,
            // Null means the card is not tappable, and the apps draw it that
            // way rather than offering a press that does nothing.
            'link_url' => $this->link_url,
        ];
    }
}
