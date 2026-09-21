<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The seller as a buyer sees them. Deliberately narrower than UserResource: no
 * credit balance, no language, no email.
 *
 * The telephone number is narrower still, and only a signed-in caller gets it.
 * Search is public and unauthenticated, and it carries the seller on every row,
 * so without this anyone could walk the pages and harvest the phone number of
 * every seller in the country in one pass — no account, nothing to block, no
 * way to tell it was happening. An account does not make that impossible, but
 * it makes it rate-limited, attributable and blockable, which is the whole
 * difference. It is also what every marketplace in the region does.
 *
 * @mixin User
 */
class SellerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'seller_type' => $this->seller_type->value,
            'dealer_name' => $this->dealer_name,
            // ResolveOptionalUser has already run, so a bearer token counts
            // here even though this route requires none.
            'phone' => $this->when($request->user() !== null, fn (): ?string => $this->phone),
            'city' => CityResource::make($this->whenLoaded('city')),
            'member_since' => $this->created_at?->toIso8601String(),
        ];
    }
}
