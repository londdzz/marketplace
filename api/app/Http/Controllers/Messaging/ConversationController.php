<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messaging\SendMessageRequest;
use App\Http\Requests\Messaging\StartConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Http\Resources\StatusResource;
use App\Models\Conversation;
use App\Models\Listing;
use App\Services\ConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ConversationController extends Controller
{
    public function __construct(private readonly ConversationService $conversations) {}

    /**
     * Every thread this person is part of, on either side, most recently active
     * first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $userId = $request->user()->getKey();

        $conversations = Conversation::query()
            ->where(fn ($query) => $query->where('buyer_id', $userId)->orWhere('seller_id', $userId))
            ->with(['listing.photos', 'listing.make', 'listing.model', 'buyer', 'seller', 'lastMessage'])
            ->withCount(['unreadMessages' => fn ($query) => $query->where('sender_id', '!=', $userId)])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        return ConversationResource::collection($conversations);
    }

    /**
     * Reach the seller of a listing. Asking twice reopens the same thread
     * rather than starting another.
     */
    public function store(StartConversationRequest $request, Listing $listing): JsonResponse
    {
        $conversation = $this->conversations->start($listing, $request->user(), $request->body());

        $conversation->load(['listing.photos', 'buyer', 'seller', 'lastMessage']);

        return ConversationResource::make($conversation)
            ->response()
            ->setStatusCode($conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function messages(Request $request, Conversation $conversation): AnonymousResourceCollection
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(50)
            ->withQueryString();

        return MessageResource::collection($messages);
    }

    public function send(SendMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('reply', $conversation);

        $message = $this->conversations->send($conversation, $request->user(), $request->body());

        return MessageResource::make($message)->response()->setStatusCode(201);
    }

    public function read(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $this->conversations->markRead($conversation, $request->user());

        return StatusResource::make(__('conversation.marked_read'))->response();
    }
}
