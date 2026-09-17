<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ListingStatus;
use App\Exceptions\ListingStatusException;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Buyer to seller conversations, one per buyer per listing.
 *
 * We never handle the car or the money. All this does is let the two sides
 * reach each other.
 */
final class ConversationService
{
    public function __construct(private readonly BlockService $blocks) {}

    /**
     * Open the conversation between a buyer and a listing, or return the one
     * that already exists. Reopening an existing thread is not a new contact
     * and is not counted as one.
     *
     * @throws ListingStatusException|HttpException
     */
    public function start(Listing $listing, User $buyer, ?string $body = null): Conversation
    {
        if ($listing->status !== ListingStatus::Active) {
            throw new ListingStatusException('conversation.listing_not_active');
        }

        if ($listing->user_id === $buyer->getKey()) {
            throw new HttpException(422, (string) __('conversation.own_listing'));
        }

        // Either side having blocked the other ends it here, before a thread
        // exists and before the seller's contact count moves.
        if ($listing->user !== null && $this->blocks->eitherWay($buyer, $listing->user)) {
            throw new HttpException(403, (string) __('block.conversation_blocked'));
        }

        return DB::transaction(function () use ($listing, $buyer, $body): Conversation {
            $conversation = Conversation::query()
                ->where('listing_id', $listing->getKey())
                ->where('buyer_id', $buyer->getKey())
                ->first();

            if (! $conversation instanceof Conversation) {
                $conversation = Conversation::query()->create([
                    'listing_id' => $listing->getKey(),
                    'buyer_id' => $buyer->getKey(),
                    'seller_id' => $listing->user_id,
                ]);

                $listing->increment('contact_count');
            }

            if ($body !== null && $body !== '') {
                $this->send($conversation, $buyer, $body);
            }

            return $conversation->refresh();
        });
    }

    public function send(Conversation $conversation, User $sender, string $body): Message
    {
        return DB::transaction(function () use ($conversation, $sender, $body): Message {
            $message = $conversation->messages()->create([
                'sender_id' => $sender->getKey(),
                'body' => $body,
            ]);

            $conversation->forceFill(['last_message_at' => Carbon::now()])->save();

            return $message;
        });
    }

    /**
     * Mark what the other side sent as read. A sender's own messages are left
     * alone; they were never unread to them.
     */
    public function markRead(Conversation $conversation, User $reader): int
    {
        return $conversation->messages()
            ->where('sender_id', '!=', $reader->getKey())
            ->whereNull('read_at')
            ->update(['read_at' => Carbon::now()]);
    }
}
