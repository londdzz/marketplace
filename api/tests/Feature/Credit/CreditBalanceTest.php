<?php

declare(strict_types=1);

use App\Enums\CreditReason;
use App\Enums\Store;
use App\Models\Listing;
use App\Models\User;
use App\Services\CreditService;
use Database\Seeders\CountrySeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->user = User::factory()->create(['country_code' => 'XK']);
    $this->credits = app(CreditService::class);
});

it('reports a zero balance with an empty ledger', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/credits')
        ->assertOk()
        ->assertJsonPath('data.balance', 0)
        ->assertJsonPath('data.history.data', [])
        ->assertJsonPath('data.history.meta.total', 0);
});

it('reports the balance and the ledger behind it, newest first', function (): void {
    $listing = Listing::factory()->create(['user_id' => $this->user->id]);

    $this->credits->grant($this->user, 8, CreditReason::Purchase, Store::Apple, 'apple-credits-1', '9.99');
    $this->credits->spend($this->user, 1, CreditReason::ListingPublish, $listing);

    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/credits')
        ->assertOk()
        ->assertJsonPath('data.balance', 7)
        ->assertJsonPath('data.history.meta.total', 2);

    $history = $response->json('data.history.data');

    expect($history[0]['delta'])->toBe(-1)
        ->and($history[0]['reason'])->toBe('listing_publish')
        ->and($history[0]['listing_id'])->toBe($listing->id)
        ->and($history[0]['balance_after'])->toBe(7)
        ->and($history[1]['delta'])->toBe(8)
        ->and($history[1]['price_paid_eur'])->toBe('9.99');
});

it('offers the three packs with the middle one marked most popular', function (): void {
    $packs = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/credits')
        ->assertOk()
        ->json('data.packs');

    expect($packs)->toHaveCount(3)
        ->and(array_column($packs, 'product_id'))->toBe(['credits_1', 'credits_8', 'credits_25'])
        ->and(array_column($packs, 'credits'))->toBe([1, 8, 25])
        ->and(array_column($packs, 'price_eur'))->toBe(['1.50', '9.99', '24.99'])
        ->and(array_column($packs, 'most_popular'))->toBe([false, true, false]);
});

it('shows one account nothing of another account ledger', function (): void {
    $other = User::factory()->create(['country_code' => 'XK']);
    $this->credits->grant($other, 25, CreditReason::Purchase, Store::Google, 'google-other', '24.99');

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/credits')
        ->assertOk()
        ->assertJsonPath('data.balance', 0)
        ->assertJsonPath('data.history.meta.total', 0);
});

it('needs a token', function (): void {
    $this->getJson('/api/v1/credits')->assertStatus(401);
});
