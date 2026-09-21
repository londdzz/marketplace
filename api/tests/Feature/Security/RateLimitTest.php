<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Laravel 11 throttles nothing by default, so every one of these would have
 * passed unlimited before the limiters existed. They are here because that is
 * exactly the kind of gap that reappears quietly in a later refactor.
 */
beforeEach(function (): void {
    RateLimiter::clear('api:ip:127.0.0.1');
    $this->seed(CountrySeeder::class);
});

it('throttles a signed-out caller on the reference endpoints', function (): void {
    $allowance = (int) config('rate_limits.global.signed_out_per_minute');

    // Right up to the ceiling, everything is fine.
    for ($i = 0; $i < $allowance; $i++) {
        $this->getJson('/api/v1/countries')->assertOk();
    }

    $this->getJson('/api/v1/countries')->assertStatus(429);
});

it('counts a signed-in caller against their account, not their address', function (): void {
    $allowance = (int) config('rate_limits.global.signed_out_per_minute');
    $user = User::factory()->create(['country_code' => 'MK']);

    // Spend the whole signed-out allowance for this address first.
    for ($i = 0; $i < $allowance; $i++) {
        $this->getJson('/api/v1/countries');
    }

    $this->getJson('/api/v1/countries')->assertStatus(429);

    // The account has its own bucket, so it is unaffected. This is what stops
    // one scraper behind a carrier network taking the app down for everybody
    // else sharing that address.
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/countries')->assertOk();
});

it('holds search to a tighter ceiling than the rest of the API', function (): void {
    expect((int) config('rate_limits.search.signed_out_per_minute'))
        ->toBeLessThan((int) config('rate_limits.global.signed_out_per_minute'));

    $allowance = (int) config('rate_limits.search.signed_out_per_minute');

    for ($i = 0; $i < $allowance; $i++) {
        $this->getJson('/api/v1/listings')->assertOk();
    }

    $this->getJson('/api/v1/listings')->assertStatus(429);
});

it('answers a throttled request with a translated message, never a framework string', function (): void {
    $allowance = (int) config('rate_limits.search.signed_out_per_minute');

    for ($i = 0; $i < $allowance; $i++) {
        $this->getJson('/api/v1/listings');
    }

    $response = $this->getJson('/api/v1/listings')->assertStatus(429);

    expect($response->json('message'))
        ->not->toBe('Too Many Attempts.')
        ->and($response->json('message'))->toBe(__('errors.rate_limited'));
});

it('leaves the purchase webhook out of the global throttle', function (): void {
    // A dropped delivery is a purchase that granted nothing. The shared secret
    // is what guards this route, not a rate limit.
    $allowance = (int) config('rate_limits.global.signed_out_per_minute');

    for ($i = 0; $i < $allowance + 5; $i++) {
        $response = $this->postJson('/api/v1/webhooks/revenuecat', []);

        // 403 because no secret is configured in tests — the point is that it
        // is never 429.
        expect($response->status())->not->toBe(429);
    }
});
