<?php

declare(strict_types=1);

use App\Enums\FuelType;
use App\Enums\ListingStatus;
use App\Enums\Transmission;
use App\Models\City;
use App\Models\Listing;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $this->city = City::query()->where('country_code', 'XK')->firstOrFail();
    $this->seller = User::factory()->create(['country_code' => 'XK', 'city_id' => $this->city->id]);
    $this->make = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $this->model = VehicleModel::query()->where('make_id', $this->make->id)->where('name', 'Passat')->firstOrFail();
});

it('opens a draft from nothing more than a make and a model', function (): void {
    $response = $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/listings', [
            'make_id' => $this->make->id,
            'model_id' => $this->model->id,
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.status', ListingStatus::Draft->value)
        ->assertJsonPath('data.make_id', $this->make->id)
        ->assertJsonPath('data.model_id', $this->model->id)
        ->assertJsonPath('data.year', null)
        ->assertJsonPath('data.price_eur', null);

    $listing = Listing::query()->sole();

    expect($listing->user_id)->toBe($this->seller->id)
        ->and($listing->status)->toBe(ListingStatus::Draft)
        // A draft starts where the seller is, which the location step can change.
        ->and($listing->country_code)->toBe('XK')
        ->and($listing->city_id)->toBe($this->city->id);
});

it('saves the draft again at every step of the sell flow', function (): void {
    $id = $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/listings', ['make_id' => $this->make->id, 'model_id' => $this->model->id])
        ->json('data.id');

    $steps = [
        ['year' => 2016, 'mileage_km' => 180000, 'fuel' => FuelType::Diesel->value, 'transmission' => Transmission::Manual->value],
        ['price_eur' => 8500, 'price_negotiable' => true, 'customs_cleared' => true],
        ['city_id' => $this->city->id, 'latitude' => 42.6629, 'longitude' => 21.1655],
        ['description' => 'Well kept, service history.', 'features' => ['air_conditioning', 'alloy_wheels']],
    ];

    foreach ($steps as $step) {
        $this->actingAs($this->seller, 'sanctum')
            ->patchJson("/api/v1/listings/{$id}", $step)
            ->assertOk();
    }

    $listing = Listing::query()->findOrFail($id);

    expect($listing->year)->toBe(2016)
        ->and($listing->mileage_km)->toBe(180000)
        ->and($listing->fuel)->toBe(FuelType::Diesel)
        ->and($listing->transmission)->toBe(Transmission::Manual)
        ->and($listing->price_eur)->toBe('8500.00')
        ->and($listing->price_negotiable)->toBeTrue()
        ->and($listing->customs_cleared)->toBeTrue()
        ->and($listing->features)->toBe(['air_conditioning', 'alloy_wheels'])
        ->and($listing->description)->toBe('Well kept, service history.')
        // None of that touched the status.
        ->and($listing->status)->toBe(ListingStatus::Draft);
});

it('refuses a status sent by the client', function (): void {
    $listing = Listing::factory()->create(['user_id' => $this->seller->id]);

    $this->actingAs($this->seller, 'sanctum')
        ->patchJson("/api/v1/listings/{$listing->id}", [
            'status' => ListingStatus::Active->value,
            'description' => 'Trying to go live for free',
        ])
        ->assertOk();

    expect($listing->fresh()->status)->toBe(ListingStatus::Draft);
});

it('refuses a model that belongs to another make', function (): void {
    $otherMake = Make::query()->where('name', 'Audi')->firstOrFail();

    $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/listings', [
            'make_id' => $otherMake->id,
            'model_id' => $this->model->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('model_id');

    expect(Listing::query()->count())->toBe(0);
});

it('refuses a city that sits in another country', function (): void {
    $foreign = City::query()->where('country_code', 'BG')->firstOrFail();

    $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/listings', ['city_id' => $foreign->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('city_id');
});

it('accepts a city when the country moves with it', function (): void {
    $foreign = City::query()->where('country_code', 'BG')->firstOrFail();

    $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/listings', ['country_code' => 'BG', 'city_id' => $foreign->id])
        ->assertStatus(201)
        ->assertJsonPath('data.country_code', 'BG')
        ->assertJsonPath('data.city_id', $foreign->id);
});

it('refuses values outside the vocabularies', function (array $payload, string $field): void {
    $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/listings', $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);
})->with([
    [['fuel' => 'nuclear'], 'fuel'],
    [['transmission' => 'cvt'], 'transmission'],
    [['body_type' => 'spaceship'], 'body_type'],
    [['drivetrain' => '6wd'], 'drivetrain'],
    [['color' => 'ultraviolet'], 'color'],
    [['features' => ['ejector_seat']], 'features.0'],
    [['year' => 1900], 'year'],
    [['year' => 2999], 'year'],
    [['mileage_km' => -1], 'mileage_km'],
    [['price_eur' => -5], 'price_eur'],
    [['doors' => 20], 'doors'],
]);

it('keeps features to known keys rather than free text', function (): void {
    $this->actingAs($this->seller, 'sanctum')
        ->postJson('/api/v1/listings', ['features' => ['air_conditioning', 'leather_seats']])
        ->assertStatus(201)
        ->assertJsonPath('data.features', ['air_conditioning', 'leather_seats']);
});

it('takes a listing down without erasing it', function (): void {
    $listing = Listing::factory()->active()->create(['user_id' => $this->seller->id]);

    $this->actingAs($this->seller, 'sanctum')
        ->deleteJson("/api/v1/listings/{$listing->id}")
        ->assertNoContent();

    expect(Listing::query()->whereKey($listing->id)->exists())->toBeFalse()
        ->and(Listing::withTrashed()->whereKey($listing->id)->first()->status)
        ->toBe(ListingStatus::Removed);
});

it('shows a published listing to anyone', function (): void {
    $listing = Listing::factory()->active()->create(['user_id' => $this->seller->id]);

    $this->getJson("/api/v1/listings/{$listing->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $listing->id)
        ->assertJsonPath('data.seller.id', $this->seller->id)
        ->assertJsonStructure(['data' => ['id', 'price_eur', 'photos', 'seller' => ['id', 'display_name', 'phone']]]);
});

it('hides a draft from everyone but its seller', function (): void {
    $listing = Listing::factory()->create(['user_id' => $this->seller->id]);
    $stranger = User::factory()->create(['country_code' => 'XK']);

    $this->getJson("/api/v1/listings/{$listing->id}")->assertStatus(403);

    $this->actingAs($stranger, 'sanctum')
        ->getJson("/api/v1/listings/{$listing->id}")
        ->assertStatus(403);

    $this->actingAs($this->seller, 'sanctum')
        ->getJson("/api/v1/listings/{$listing->id}")
        ->assertOk();
});

it('counts a view once per address per day', function (): void {
    $listing = Listing::factory()->active()->create(['user_id' => $this->seller->id]);

    $this->getJson("/api/v1/listings/{$listing->id}")->assertOk();
    $this->getJson("/api/v1/listings/{$listing->id}")->assertOk();
    $this->getJson("/api/v1/listings/{$listing->id}")->assertOk();

    expect($listing->fresh()->view_count)->toBe(1);
});

it('does not count the seller looking at their own listing', function (): void {
    $listing = Listing::factory()->active()->create(['user_id' => $this->seller->id]);

    $this->actingAs($this->seller, 'sanctum')
        ->getJson("/api/v1/listings/{$listing->id}")
        ->assertOk();

    expect($listing->fresh()->view_count)->toBe(0);
});

it('lists the seller their own listings, drafts included', function (): void {
    Listing::factory()->count(2)->create(['user_id' => $this->seller->id]);
    Listing::factory()->active()->create(['user_id' => $this->seller->id]);
    Listing::factory()->active()->create();

    $this->actingAs($this->seller, 'sanctum')
        ->getJson('/api/v1/my/listings')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure(['data', 'links', 'meta']);
});

it('narrows the seller list to one status', function (): void {
    Listing::factory()->count(2)->create(['user_id' => $this->seller->id]);
    Listing::factory()->active()->create(['user_id' => $this->seller->id]);

    $this->actingAs($this->seller, 'sanctum')
        ->getJson('/api/v1/my/listings?status=active')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'active');
});

it('rejects a status the marketplace does not have', function (): void {
    $this->actingAs($this->seller, 'sanctum')
        ->getJson('/api/v1/my/listings?status=archived')
        ->assertStatus(422)
        ->assertJsonValidationErrors('status');
});
