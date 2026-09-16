<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A thread as one of its two participants sees it, including who the other
 * person is and how many of their messages are still unread.
 *
 * @mixin Conversation
 */
class ConversationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isSeller = $viewer instanceof User && $viewer->getKey() === $this->seller_id;

        return [
            'id' => $this->id,
            'listing_id' => $this->listing_id,
            'listing' => ListingResource::make($this->whenLoaded('listing')),
            'role' => $isSeller ? 'seller' : 'buyer',
            'counterpart' => SellerResource::make(
                $isSeller ? $this->whenLoaded('buyer') : $this->whenLoaded('seller')
            ),
            'unread_count' => $this->whenCounted('unreadMessages'),
            'last_message' => MessageResource::make($this->whenLoaded('lastMessage')),
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
