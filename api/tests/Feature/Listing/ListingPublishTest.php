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
use App\Models\ListingPhoto;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use App\Services\CreditService;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;
use Illuminate\Support\Carbon;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $this->credits = app(CreditService::class);
    $this->city = City::query()->where('country_code', 'XK')->firstOrFail();
    $this->seller = User::factory()->create(['country_code' => 'XK', 'city_id' => $this->city->id]);
});

/**
 * A draft with everything a buyer needs, including the four photos the sell
 * flow insists on.
 */
function readyDraft(array $overrides = []): Listing
{
    $make = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $model = VehicleModel::query()->where('make_id', $make->id)->where('name', 'Golf')->firstOrFail();

    $listing = Listing::factory()->create(array_merge([
        'user_id' => test()->seller->id,
        'status' => ListingStatus::Draft,
        'make_id' => $make->id,
        'model_id' => $model->id,
        'year' => 2015,
        'mileage_km' => 150000,
        'fuel' => FuelType::Diesel,
        'transmission' => Transmission::Manual,
        'price_eur' => '7500.00',
        'country_code' => 'XK',
        'city_id' => test()->city->id,
    ], $overrides));

    foreach (range(0, 3) as $position) {
        ListingPhoto::query()->create([
            'listing_id' => $listing->id,
            'path' => "listings/{$listing->id}/photo-{$position}.jpg",
            'thumb_path' => "listings/{$listing->id}/photo-{$position}_thumb.jpg",
            'position' => $position,
            'width' => 1600,
            'height' => 1067,
        ]);
    }

    return $listing;
}

it('publishes a complete draft by spending one credit', function (): void {
    $listing = readyDraft();
    $this->credits->grant($this->seller, 3, CreditReason::Purchase, Store::Apple, 'apple-publish-1', '4.50');

    $response = $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/publish")
        ->assertOk()
        ->assertJsonPath('data.status', ListingStatus::Active->value);

    $listing->refresh();

    expect($listing->status)->toBe(ListingStatus::Active)
        ->and($listing->published_at)->not->toBeNull()
        ->and($listing->bumped_at)->not->toBeNull()
        ->and($listing->expires_at->isSameDay(Carbon::now()->addDays(14)))->toBeTrue()
        ->and($this->credits->balance($this->seller))->toBe(2);

    $spend = CreditTransaction::query()->where('delta', '<', 0)->sole();

    expect($spend->reason)->toBe(CreditReason::ListingPublish)
        ->and($spend->listing_id)->toBe($listing->id)
        ->and($spend->balance_after)->toBe(2)
        ->and($response->json('data.expires_at'))->not->toBeNull();
});

it('answers 402 when the balance cannot cover it and changes nothing', function (): void {
    $listing = readyDraft();

    $this->actingAs($this->seller, 'sanctum')
        ->withHeader('Accept-Language', 'mk')
        ->postJson("/api/v1/listings/{$listing->id}/publish")
        ->assertStatus(402)
        ->assertJsonPath('message', trans('credits.insufficient', [], 'mk'));

    expect($listing->fresh()->status)->toBe(ListingStatus::Draft)
        ->and($listing->fresh()->published_at)->toBeNull()
        ->and($this->credits->balance($this->seller))->toBe(0)
        ->and(CreditTransaction::query()->count())->toBe(0);
});

it('refuses to publish a draft that is still missing details', function (): void {
    $listing = readyDraft(['price_eur' => null, 'year' => null]);
    $this->credits->grant($this->seller, 1, CreditReason::Promo);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/publish")
        ->assertStatus(422)
        ->assertJsonPath('missing', ['year', 'price_eur']);

    expect($listing->fresh()->status)->toBe(ListingStatus::Draft)
        ->and($this->credits->balance($this->seller))->toBe(1);
});

it('refuses to publish without the four photos the sell flow asks for', function (): void {
    $listing = readyDraft();
    $listing->photos()->orderByDesc('position')->first()->delete();
    $this->credits->grant($this->seller, 1, CreditReason::Promo);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/publish")
        ->assertStatus(422)
        ->assertJsonPath('missing', ['photos']);

    expect($this->credits->balance($this->seller))->toBe(1);
});

it('will not publish a listing that is already live', function (): void {
    $listing = readyDraft();
    $this->credits->grant($this->seller, 5, CreditReason::Promo);

    $this->actingAs($this->seller, 'sanctum')->postJson("/api/v1/listings/{$listing->id}/publish")->assertOk();

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/publish")
        ->assertStatus(422);

    expect($this->credits->balance($this->seller))->toBe(4);
});

it('publishes an expired listing again', function (): void {
    $listing = readyDraft(['status' => ListingStatus::Expired]);
    $this->credits->grant($this->seller, 1, CreditReason::Promo);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/publish")
        ->assertOk()
        ->assertJsonPath('data.status', ListingStatus::Active->value);
});

it('renews a live listing for another two weeks and bumps it', function (): void {
    $listing = readyDraft();
    $this->credits->grant($this->seller, 2, CreditReason::Promo);

    $this->actingAs($this->seller, 'sanctum')->postJson("/api/v1/listings/{$listing->id}/publish")->assertOk();

    $firstExpiry = $listing->fresh()->expires_at;

    Carbon::setTestNow(Carbon::now()->addDays(3));

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/renew")
        ->assertOk();

    $listing->refresh();

    // The eleven days still left were kept, not thrown away.
    expect($listing->expires_at->isSameDay($firstExpiry->copy()->addDays(14)))->toBeTrue()
        ->and($listing->bumped_at->isSameDay(Carbon::now()))->toBeTrue()
        ->and($this->credits->balance($this->seller))->toBe(0);

    Carbon::setTestNow();
});

it('renews an expired listing from today', function (): void {
    $listing = readyDraft([
        'status' => ListingStatus::Expired,
        'published_at' => Carbon::now()->subDays(20),
        'expires_at' => Carbon::now()->subDays(2),
    ]);
    $this->credits->grant($this->seller, 1, CreditReason::Promo);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/renew")
        ->assertOk();

    expect($listing->fresh()->expires_at->isSameDay(Carbon::now()->addDays(14)))->toBeTrue()
        ->and($listing->fresh()->status)->toBe(ListingStatus::Active);
});

it('answers 402 on renew with no credits', function (): void {
    $listing = readyDraft(['status' => ListingStatus::Active, 'expires_at' => Carbon::now()->addDay()]);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/renew")
        ->assertStatus(402);

    expect($listing->fresh()->expires_at->isSameDay(Carbon::now()->addDay()))->toBeTrue();
});

it('will not renew a draft that was never published', function (): void {
    $listing = readyDraft();
    $this->credits->grant($this->seller, 1, CreditReason::Promo);

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/renew")
        ->assertStatus(422);

    expect($this->credits->balance($this->seller))->toBe(1);
});

it('marks a live listing sold without charging for it', function (): void {
    $listing = readyDraft();
    $this->credits->grant($this->seller, 1, CreditReason::Promo);
    $this->actingAs($this->seller, 'sanctum')->postJson("/api/v1/listings/{$listing->id}/publish")->assertOk();

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/mark-sold")
        ->assertOk()
        ->assertJsonPath('data.status', ListingStatus::Sold->value);

    expect($this->credits->balance($this->seller))->toBe(0);
});

it('will not mark a draft sold', function (): void {
    $listing = readyDraft();

    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/mark-sold")
        ->assertStatus(422);
});

it('lets nobody but the seller publish, renew or mark sold', function (string $action): void {
    $listing = readyDraft();
    $stranger = User::factory()->create(['country_code' => 'XK']);
    $this->credits->grant($stranger, 5, CreditReason::Promo);

    $this->actingAs($stranger, 'sanctum')
        ->postJson("/api/v1/listings/{$listing->id}/{$action}")
        ->assertStatus(403);

    expect($listing->fresh()->status)->toBe(ListingStatus::Draft)
        ->and($this->credits->balance($stranger))->toBe(5);
})->with(['publish', 'renew', 'mark-sold']);

it('needs a token to publish', function (): void {
    $listing = readyDraft();

    $this->postJson("/api/v1/listings/{$listing->id}/publish")->assertStatus(401);
});
