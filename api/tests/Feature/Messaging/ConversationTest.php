<?php

declare(strict_types=1);

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Database\Seeders\CountrySeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->seller = User::factory()->create(['country_code' => 'XK']);
    $this->buyer = User::factory()->create(['country_code' => 'XK']);
    $this->listing = Listing::factory()->active()->create(['user_id' => $this->seller->id]);
});

it('opens a thread with the seller and counts the contact', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations", ['body' => 'Is it still available?'])
        ->assertStatus(201)
        ->assertJsonPath('data.listing_id', $this->listing->id)
        ->assertJsonPath('data.role', 'buyer')
        ->assertJsonPath('data.counterpart.id', $this->seller->id)
        ->assertJsonPath('data.last_message.body', 'Is it still available?');

    $conversation = Conversation::query()->sole();

    expect($conversation->buyer_id)->toBe($this->buyer->id)
        ->and($conversation->seller_id)->toBe($this->seller->id)
        ->and($conversation->last_message_at)->not->toBeNull()
        ->and($this->listing->fresh()->contact_count)->toBe(1);
});

it('reopens the same thread instead of starting another', function (): void {
    $first = $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations", ['body' => 'Hello'])
        ->assertStatus(201)
        ->json('data.id');

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations")
        ->assertOk()
        ->assertJsonPath('data.id', $first);

    expect(Conversation::query()->count())->toBe(1)
        // Reopening is not a new contact.
        ->and($this->listing->fresh()->contact_count)->toBe(1);
});

it('opens without a first message', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations")
        ->assertStatus(201);

    expect(Message::query()->count())->toBe(0);
});

it('will not let a seller message themselves', function (): void {
    $this->actingAs($this->seller, 'sanctum')
        ->withHeader('Accept-Language', 'sq')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations")
        ->assertStatus(422)
        ->assertJsonPath('message', trans('conversation.own_listing', [], 'sq'));

    expect(Conversation::query()->count())->toBe(0);
});

it('will not open a thread about a listing that is not live', function (): void {
    $draft = Listing::factory()->create(['user_id' => $this->seller->id]);

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$draft->id}/conversations")
        ->assertStatus(422);

    expect(Conversation::query()->count())->toBe(0);
});

it('stops after twenty new conversations in a day', function (): void {
    foreach (range(1, 20) as $index) {
        $listing = Listing::factory()->active()->create();

        $this->actingAs($this->buyer, 'sanctum')
            ->postJson("/api/v1/listings/{$listing->id}/conversations")
            ->assertStatus(201);
    }

    $twentyFirst = Listing::factory()->active()->create();

    $this->actingAs($this->buyer, 'sanctum')
        ->withHeader('Accept-Language', 'sq')
        ->postJson("/api/v1/listings/{$twentyFirst->id}/conversations")
        ->assertStatus(429)
        ->assertJsonPath('message', trans('conversation.daily_limit', [], 'sq'));

    expect(Conversation::query()->count())->toBe(20);
});

it('counts the daily limit per account, not across accounts', function (): void {
    foreach (range(1, 20) as $index) {
        $listing = Listing::factory()->active()->create();
        $this->actingAs($this->buyer, 'sanctum')
            ->postJson("/api/v1/listings/{$listing->id}/conversations")
            ->assertStatus(201);
    }

    $other = User::factory()->create(['country_code' => 'XK']);
    $listing = Listing::factory()->active()->create();

    $this->actingAs($other, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/conversations")
        ->assertStatus(201);
});

it('carries messages both ways', function (): void {
    $conversation = Conversation::query()->create([
        'listing_id' => $this->listing->id,
        'buyer_id' => $this->buyer->id,
        'seller_id' => $this->seller->id,
    ]);

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => 'Still for sale?'])
        ->assertStatus(201)
        ->assertJsonPath('data.body', 'Still for sale?')
        ->assertJsonPath('data.is_mine', true);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => 'Yes, come and see it.'])
        ->assertStatus(201);

    $thread = $this->actingAs($this->buyer, 'sanctum')
        ->getJson("/api/v1/conversations/{$conversation->id}/messages")
        ->assertOk()
        ->json('data');

    expect($thread)->toHaveCount(2)
        // Newest first, which is what a chat screen renders from.
        ->and($thread[0]['body'])->toBe('Yes, come and see it.')
        ->and($thread[0]['is_mine'])->toBeFalse();
});

it('refuses an empty message', function (): void {
    $conversation = Conversation::query()->create([
        'listing_id' => $this->listing->id,
        'buyer_id' => $this->buyer->id,
        'seller_id' => $this->seller->id,
    ]);

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => ''])
        ->assertStatus(422)
        ->assertJsonValidationErrors('body');
});

it('lists both sides of the conversations a person is in', function (): void {
    $asBuyer = Conversation::query()->create([
        'listing_id' => $this->listing->id,
        'buyer_id' => $this->buyer->id,
        'seller_id' => $this->seller->id,
    ]);

    $ownListing = Listing::factory()->active()->create(['user_id' => $this->buyer->id]);
    $stranger = User::factory()->create(['country_code' => 'XK']);

    $asSeller = Conversation::query()->create([
        'listing_id' => $ownListing->id,
        'buyer_id' => $stranger->id,
        'seller_id' => $this->buyer->id,
    ]);

    $response = $this->actingAs($this->buyer, 'sanctum')
        ->getJson('/api/v1/conversations')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    $roles = array_column($response->json('data'), 'role', 'id');

    expect($roles[$asBuyer->id])->toBe('buyer')
        ->and($roles[$asSeller->id])->toBe('seller');
});

it('counts what the other side sent and has not been read', function (): void {
    $conversation = Conversation::query()->create([
        'listing_id' => $this->listing->id,
        'buyer_id' => $this->buyer->id,
        'seller_id' => $this->seller->id,
    ]);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => 'One']);
    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => 'Two']);
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => 'Mine']);

    $this->actingAs($this->buyer, 'sanctum')
        ->getJson('/api/v1/conversations')
        ->assertOk()
        ->assertJsonPath('data.0.unread_count', 2);

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/read")
        ->assertOk();

    $this->actingAs($this->buyer, 'sanctum')
        ->getJson('/api/v1/conversations')
        ->assertOk()
        ->assertJsonPath('data.0.unread_count', 0);

    // The buyer's own message was never unread to them, and marking read did
    // not touch it.
    expect(Message::query()->where('body', 'Mine')->sole()->read_at)->toBeNull();
});

it('keeps a stranger out of a conversation', function (): void {
    $conversation = Conversation::query()->create([
        'listing_id' => $this->listing->id,
        'buyer_id' => $this->buyer->id,
        'seller_id' => $this->seller->id,
    ]);

    $stranger = User::factory()->create(['country_code' => 'XK']);

    $this->actingAs($stranger, 'sanctum')
        ->getJson("/api/v1/conversations/{$conversation->id}/messages")
        ->assertStatus(403);

    $this->actingAs($stranger, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => 'Hello'])
        ->assertStatus(403);

    $this->actingAs($stranger, 'sanctum')
        ->postJson("/api/v1/conversations/{$conversation->id}/read")
        ->assertStatus(403);

    expect(Message::query()->count())->toBe(0);
});

it('shows a stranger nothing in their own conversation list', function (): void {
    Conversation::query()->create([
        'listing_id' => $this->listing->id,
        'buyer_id' => $this->buyer->id,
        'seller_id' => $this->seller->id,
    ]);

    $stranger = User::factory()->create(['country_code' => 'XK']);

    $this->actingAs($stranger, 'sanctum')
        ->getJson('/api/v1/conversations')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('needs a token', function (string $method, string $path): void {
    $this->json($method, $path)->assertStatus(401);
})->with([
    ['get', '/api/v1/conversations'],
    ['post', '/api/v1/listings/00000000-0000-0000-0000-000000000000/conversations'],
]);
