<?php

declare(strict_types=1);

use App\Enums\ListingStatus;
use App\Models\Listing;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Carbon;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
});

it('expires a live listing whose time is up', function (): void {
    $listing = Listing::factory()->active()->create([
        'expires_at' => Carbon::now()->subMinute(),
    ]);

    $this->artisan('listings:expire')
        ->expectsOutputToContain('Expired 1 listings.')
        ->assertSuccessful();

    expect($listing->fresh()->status)->toBe(ListingStatus::Expired);
});

it('leaves a live listing alone until its time is up', function (): void {
    $listing = Listing::factory()->active()->create([
        'expires_at' => Carbon::now()->addMinute(),
    ]);

    $this->artisan('listings:expire')->assertSuccessful();

    expect($listing->fresh()->status)->toBe(ListingStatus::Active);
});

it('expires a listing at the moment it runs out, not a moment later', function (): void {
    $listing = Listing::factory()->active()->create([
        'expires_at' => Carbon::now(),
    ]);

    $this->artisan('listings:expire')->assertSuccessful();

    expect($listing->fresh()->status)->toBe(ListingStatus::Expired);
});

it('touches nothing that is not live', function (): void {
    $past = Carbon::now()->subDay();

    $draft = Listing::factory()->create(['status' => ListingStatus::Draft, 'expires_at' => $past]);
    $sold = Listing::factory()->create(['status' => ListingStatus::Sold, 'expires_at' => $past]);
    $removed = Listing::factory()->create(['status' => ListingStatus::Removed, 'expires_at' => $past]);
    $alreadyExpired = Listing::factory()->expired()->create(['expires_at' => $past]);

    $this->artisan('listings:expire')
        ->expectsOutputToContain('Expired 0 listings.')
        ->assertSuccessful();

    expect($draft->fresh()->status)->toBe(ListingStatus::Draft)
        ->and($sold->fresh()->status)->toBe(ListingStatus::Sold)
        ->and($removed->fresh()->status)->toBe(ListingStatus::Removed)
        ->and($alreadyExpired->fresh()->status)->toBe(ListingStatus::Expired);
});

it('ignores a live listing that carries no expiry at all', function (): void {
    $listing = Listing::factory()->active()->create(['expires_at' => null]);

    $this->artisan('listings:expire')->assertSuccessful();

    expect($listing->fresh()->status)->toBe(ListingStatus::Active);
});

it('expires a whole batch in one run', function (): void {
    Listing::factory()->count(5)->active()->create(['expires_at' => Carbon::now()->subHour()]);
    Listing::factory()->count(2)->active()->create(['expires_at' => Carbon::now()->addWeek()]);

    $this->artisan('listings:expire')
        ->expectsOutputToContain('Expired 5 listings.')
        ->assertSuccessful();

    expect(Listing::query()->where('status', ListingStatus::Active)->count())->toBe(2)
        ->and(Listing::query()->where('status', ListingStatus::Expired)->count())->toBe(5);
});

it('does nothing on a second run', function (): void {
    Listing::factory()->active()->create(['expires_at' => Carbon::now()->subHour()]);

    $this->artisan('listings:expire')->assertSuccessful();

    $this->artisan('listings:expire')
        ->expectsOutputToContain('Expired 0 listings.')
        ->assertSuccessful();
});

it('takes an expired listing out of the search results', function (): void {
    $listing = Listing::factory()->active()->create(['expires_at' => Carbon::now()->subHour()]);

    $this->getJson('/api/v1/listings')->assertOk()->assertJsonCount(1, 'data');

    $this->artisan('listings:expire')->assertSuccessful();

    $this->getJson('/api/v1/listings')->assertOk()->assertJsonCount(0, 'data');

    // The seller can still see it, and renewing is what brings it back.
    expect($listing->fresh()->status)->toBe(ListingStatus::Expired);
});
