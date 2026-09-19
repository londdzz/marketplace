<?php

declare(strict_types=1);

use App\Enums\CreditReason;
use App\Enums\FuelType;
use App\Enums\ListingStatus;
use App\Enums\Store;
use App\Enums\Transmission;
use App\Models\City;
use App\Models\CreditTransaction;
use App\Models\Listing;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use App\Services\CreditService;
use App\Services\ListingService;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    Cache::flush();

    $this->credits = app(CreditService::class);
    $this->city = City::query()->where('country_code', 'XK')->firstOrFail();
    $this->seller = User::factory()->create(['country_code' => 'XK', 'city_id' => $this->city->id]);
});

/** A listing a buyer can already see, which is the only kind worth promoting. */
function activeListing(array $overrides = []): Listing
{
    $make = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $model = VehicleModel::query()->where('make_id', $make->id)->where('name', 'Golf')->firstOrFail();

    return Listing::factory()->create(array_merge([
        'user_id' => test()->seller->id,
        'status' => ListingStatus::Active,
        'make_id' => $make->id,
        'model_id' => $model->id,
        'year' => 2015,
        'mileage_km' => 150000,
        'fuel' => FuelType::Diesel,
        'transmission' => Transmission::Manual,
        'price_eur' => '7500.00',
        'country_code' => 'XK',
        'city_id' => test()->city->id,
        'published_at' => Carbon::now(),
        'expires_at' => Carbon::now()->addDays(14),
    ], $overrides));
}

it('turns credits into days of promotion', function (): void {
    $listing = activeListing();
    $this->credits->grant($this->seller, 10, CreditReason::Purchase, Store::Apple, 'apple-promote-1', '9.99');

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/promote", ['credits' => 5])
        ->assertOk()
        ->assertJsonPath('data.is_featured', true);

    $listing->refresh();

    // Five credits at two days each.
    expect($listing->featured_until->isSameDay(Carbon::now()->addDays(10)))->toBeTrue()
        ->and($this->credits->balance($this->seller))->toBe(5);

    $spend = CreditTransaction::query()->where('reason', CreditReason::Feature)->sole();

    expect($spend->delta)->toBe(-5)
        ->and($spend->listing_id)->toBe($listing->id)
        ->and($spend->balance_after)->toBe(5);
});

it('adds to a promotion still running rather than restarting it', function (): void {
    $listing = activeListing(['featured_until' => Carbon::now()->addDays(4)]);
    $this->credits->grant($this->seller, 6, CreditReason::Purchase, Store::Apple, 'apple-promote-2', '9.99');

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/promote", ['credits' => 3])
        ->assertOk();

    // Four days left plus six bought, not six from today.
    expect($listing->refresh()->featured_until->isSameDay(Carbon::now()->addDays(10)))->toBeTrue();
});

it('refuses to promote without the credits and leaves the listing alone', function (): void {
    $listing = activeListing();
    $this->credits->grant($this->seller, 2, CreditReason::Purchase, Store::Apple, 'apple-promote-3', '1.50');

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/promote", ['credits' => 5])
        ->assertStatus(402);

    expect($listing->refresh()->featured_until)->toBeNull()
        ->and($this->credits->balance($this->seller))->toBe(2);
});

it('refuses to promote a listing no buyer can see', function (): void {
    $listing = activeListing(['status' => ListingStatus::Draft]);
    $this->credits->grant($this->seller, 5, CreditReason::Purchase, Store::Apple, 'apple-promote-4', '4.50');

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/promote", ['credits' => 2])
        ->assertStatus(422);

    expect($this->credits->balance($this->seller))->toBe(5);
});

it('lets nobody promote a listing that is not theirs', function (): void {
    $listing = activeListing();
    $stranger = User::factory()->create(['country_code' => 'XK', 'city_id' => $this->city->id]);
    $this->credits->grant($stranger, 5, CreditReason::Purchase, Store::Apple, 'apple-promote-5', '4.50');

    $this->actingAs($stranger, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/promote", ['credits' => 2])
        ->assertForbidden();

    expect($listing->refresh()->featured_until)->toBeNull()
        ->and($this->credits->balance($stranger))->toBe(5);
});

it('rejects an amount outside what a promotion takes', function (): void {
    $listing = activeListing();
    $this->credits->grant($this->seller, 50, CreditReason::Purchase, Store::Apple, 'apple-promote-6', '24.99');

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/promote", ['credits' => 0])
        ->assertStatus(422);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/promote", ['credits' => 999])
        ->assertStatus(422);

    expect($this->credits->balance($this->seller))->toBe(50);
});

it('says nothing about what others spend until enough of them have', function (): void {
    $listing = activeListing();
    $this->credits->grant($this->seller, 30, CreditReason::Purchase, Store::Apple, 'apple-promote-7', '24.99');

    $this->actingAs($this->seller, 'sanctum')
        ->getJson("/api/v1/listings/{$listing->id}/promotion")
        ->assertOk()
        ->assertJsonPath('data.days_per_credit', 2)
        ->assertJsonPath('data.balance', 30)
        ->assertJsonPath('data.typical', null);
});

it('reports the middle of the market once there is one', function (): void {
    $listing = activeListing();
    $this->credits->grant($this->seller, 60, CreditReason::Purchase, Store::Apple, 'apple-promote-8', '24.99');

    // Six promotions by other sellers: 1, 2, 4, 6, 8 and 10 credits.
    foreach ([1, 2, 4, 6, 8, 10] as $index => $credits) {
        $other = User::factory()->create(['country_code' => 'XK', 'city_id' => $this->city->id]);
        $this->credits->grant($other, $credits, CreditReason::Purchase, Store::Apple, "apple-other-{$index}", '24.99');

        $theirs = activeListing(['user_id' => $other->id]);
        app(ListingService::class)->promote($theirs, $credits);
    }

    Cache::flush();

    $response = $this->actingAs($this->seller, 'sanctum')
        ->getJson("/api/v1/listings/{$listing->id}/promotion")
        ->assertOk();

    $typical = $response->json('data.typical');

    expect($typical['sample'])->toBe(6)
        ->and($typical['low'])->toBeLessThanOrEqual($typical['median'])
        ->and($typical['median'])->toBeLessThanOrEqual($typical['high'])
        ->and($typical['low'])->toBeGreaterThanOrEqual(1)
        ->and($typical['high'])->toBeLessThanOrEqual(10);
});
