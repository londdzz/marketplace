<?php

declare(strict_types=1);

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\User;
use App\Models\UserBlock;
use Database\Seeders\CountrySeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->seller = User::factory()->create(['country_code' => 'MK', 'display_name' => 'Auto Skopje']);
    $this->buyer = User::factory()->create(['country_code' => 'MK']);
    $this->listing = Listing::factory()->active()->create(['user_id' => $this->seller->id]);
});

it('blocks someone and lists them back', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
        ->assertStatus(201)
        ->assertJsonPath('data.id', $this->seller->id)
        ->assertJsonPath('data.display_name', 'Auto Skopje');

    $this->actingAs($this->buyer, 'sanctum')
        ->getJson('/api/v1/blocks')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->seller->id);
});

it('blocks the same person twice without complaining', function (): void {
    foreach ([1, 2] as $attempt) {
        $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
            ->assertStatus(201);
    }

    expect(UserBlock::query()->count())->toBe(1);
});

it('refuses to let anyone block themselves', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->buyer->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('user_id');
});

it('hides the blocked seller from the buyer, and the buyer from the seller', function (): void {
    $mine = Listing::factory()->active()->create(['user_id' => $this->buyer->id]);

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
        ->assertStatus(201);

    // The person who blocked cannot open the listing...
    $this->actingAs($this->buyer, 'sanctum')
        ->getJson("/api/v1/listings/{$this->listing->id}")
        ->assertStatus(403);

    // ...and the person who was blocked cannot open theirs either.
    $this->actingAs($this->seller, 'sanctum')
        ->getJson("/api/v1/listings/{$mine->id}")
        ->assertStatus(403);

    // A stranger still sees both.
    $stranger = User::factory()->create(['country_code' => 'MK']);

    $this->actingAs($stranger, 'sanctum')
        ->getJson("/api/v1/listings/{$this->listing->id}")
        ->assertOk();
});

it('refuses to start a conversation in either direction', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
        ->assertStatus(201);

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations", ['body' => 'Hello'])
        ->assertStatus(403);

    expect(Conversation::query()->count())->toBe(0)
        ->and($this->listing->refresh()->contact_count)->toBe(0);

    $mine = Listing::factory()->active()->create(['user_id' => $this->buyer->id]);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$mine->id}/conversations", ['body' => 'Hello'])
        ->assertStatus(403);
});

it('closes a thread that already existed, for both of them', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations", ['body' => 'Is it available?'])
        ->assertStatus(201);

    $conversation = Conversation::query()->sole();

    $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->buyer->id])
        ->assertStatus(201);

    foreach ([$this->buyer, $this->seller] as $user) {
        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/conversations/{$conversation->id}/messages")
            ->assertStatus(403);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['body' => 'Still there?'])
            ->assertStatus(403);
    }
});

it('hides a blocked seller from saved cars', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => $this->listing->id])
        ->assertStatus(201);

    $this->actingAs($this->buyer, 'sanctum')
        ->getJson('/api/v1/favorites')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
        ->assertStatus(201);

    $this->actingAs($this->buyer, 'sanctum')
        ->getJson('/api/v1/favorites')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('gives everything back when the block is lifted', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/conversations", ['body' => 'Is it available?'])
        ->assertStatus(201);

    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
        ->assertStatus(201);

    $this->actingAs($this->buyer, 'sanctum')
        ->deleteJson("/api/v1/blocks/{$this->seller->id}")
        ->assertNoContent();

    // The thread was hidden, not deleted, and the listing reads again.
    $this->actingAs($this->buyer, 'sanctum')
        ->getJson('/api/v1/conversations')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($this->buyer, 'sanctum')
        ->getJson("/api/v1/listings/{$this->listing->id}")
        ->assertOk();

    expect(UserBlock::query()->count())->toBe(0);
});

it('takes the blocks with the account when it is deleted', function (): void {
    $this->actingAs($this->buyer, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
        ->assertStatus(201);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/blocks', ['user_id' => $this->buyer->id])
        ->assertStatus(201);

    expect(UserBlock::query()->count())->toBe(2);

    $token = $this->buyer->createToken('phone')->plainTextToken;

    $this->withToken($token)->deleteJson('/api/v1/me')->assertOk();

    expect(UserBlock::query()->count())->toBe(0);
});

it('needs a token', function (): void {
    $this->getJson('/api/v1/blocks')->assertStatus(401);
    $this->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])->assertStatus(401);
});

it('honours a bearer token on the public endpoints, where nothing requires one', function (): void {
    // Regression: searching and reading a listing carry no auth middleware, so
    // $request->user() answered from the default guard and never saw the
    // token. Blocking then did nothing on exactly those two screens.
    $token = $this->buyer->createToken('phone')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/v1/blocks', ['user_id' => $this->seller->id])
        ->assertStatus(201);

    $found = array_column($this->withToken($token)->getJson('/api/v1/listings')->json('data'), 'id');

    expect($found)->not->toContain($this->listing->id);

    $this->withToken($token)
        ->getJson("/api/v1/listings/{$this->listing->id}")
        ->assertStatus(403);

    // Without the token it is a public listing like any other. withToken()
    // keeps sending that header, and one application instance serves every
    // request in a test, so both have to be cleared to ask anonymously.
    $this->flushHeaders();
    asNewRequest();

    expect(array_column($this->getJson('/api/v1/listings')->json('data'), 'id'))
        ->toContain($this->listing->id);
});
