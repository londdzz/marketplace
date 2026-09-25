<?php

declare(strict_types=1);

use App\Enums\CreditReason;
use App\Models\City;
use App\Models\ListingPhoto;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use App\Services\CreditService;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $this->seller = User::factory()->create(['country_code' => 'MK']);
    Sanctum::actingAs($this->seller);
});

function modelOf(string $make, string $name, string $type): VehicleModel
{
    $makeRow = Make::query()->where('name', $make)->firstOrFail();

    return VehicleModel::query()
        ->where('make_id', $makeRow->id)
        ->where('name', $name)
        ->where('vehicle_type', $type)
        ->firstOrFail();
}

it('opens a motorcycle draft that carries its shape from the model', function (): void {
    $model = modelOf('Honda', 'PCX 125', 'motorcycle');

    $response = $this->postJson('/api/v1/listings', [
        'vehicle_type' => 'motorcycle',
        'make_id' => $model->make_id,
        'model_id' => $model->id,
    ])->assertCreated();

    expect($response->json('data.vehicle_type'))->toBe('motorcycle')
        // A PCX is a scooter, and the seller confirms it later like any other
        // shape rather than being asked cold.
        ->and($response->json('data.body_type'))->toBe('scooter');
});

it('defaults a draft to a car when nothing says otherwise', function (): void {
    $model = modelOf('Volkswagen', 'Golf', 'car');

    $this->postJson('/api/v1/listings', [
        'make_id' => $model->make_id,
        'model_id' => $model->id,
    ])->assertCreated()->assertJsonPath('data.vehicle_type', 'car');
});

it('refuses a car model on a motorcycle, and a bike model on a car', function (): void {
    $bmw = Make::query()->where('name', 'BMW')->firstOrFail();
    $x5 = modelOf('BMW', 'X5', 'car');
    $gs = modelOf('BMW', 'R 1250 GS', 'motorcycle');

    // Both belong to BMW, so the make check passes and only the kind catches
    // it. A Golf filed as a motorcycle would be invisible in car results and
    // nonsense in bike ones, and nothing further down would notice.
    $this->postJson('/api/v1/listings', [
        'vehicle_type' => 'motorcycle',
        'make_id' => $bmw->id,
        'model_id' => $x5->id,
    ])->assertStatus(422)->assertJsonValidationErrors('model_id');

    $this->postJson('/api/v1/listings', [
        'make_id' => $bmw->id,
        'model_id' => $gs->id,
    ])->assertStatus(422)->assertJsonValidationErrors('model_id');
});

it('accepts a motorcycle shape on a motorcycle and refuses a car one', function (): void {
    $model = modelOf('Yamaha', 'MT-07', 'motorcycle');

    $listing = $this->postJson('/api/v1/listings', [
        'vehicle_type' => 'motorcycle',
        'make_id' => $model->make_id,
        'model_id' => $model->id,
    ])->assertCreated()->json('data.id');

    $this->patchJson("/api/v1/listings/{$listing}", ['body_type' => 'cruiser'])
        ->assertOk()
        ->assertJsonPath('data.body_type', 'cruiser');

    // The draft is already a motorcycle, so the vocabulary follows from the row
    // rather than having to be restated on every edit.
    $this->patchJson("/api/v1/listings/{$listing}", ['body_type' => 'estate'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('body_type');
});

it('publishes a motorcycle with no doors and no seats', function (): void {
    $model = modelOf('Yamaha', 'MT-07', 'motorcycle');
    $city = City::query()->where('country_code', 'MK')->firstOrFail();

    $listing = $this->postJson('/api/v1/listings', [
        'vehicle_type' => 'motorcycle',
        'make_id' => $model->make_id,
        'model_id' => $model->id,
        'year' => 2019,
        'mileage_km' => 12000,
        'fuel' => 'petrol',
        'transmission' => 'manual',
        'price_eur' => 6200,
        'country_code' => 'MK',
        'city_id' => $city->id,
    ])->assertCreated()->json('data.id');

    foreach (range(0, 3) as $position) {
        ListingPhoto::query()->create([
            'listing_id' => $listing,
            'path' => "listings/{$listing}/photo-{$position}.jpg",
            'thumb_path' => "listings/{$listing}/photo-{$position}_thumb.jpg",
            'position' => $position,
            'width' => 1600,
            'height' => 1067,
        ]);
    }

    app(CreditService::class)->grant($this->seller, 1, CreditReason::Promo);

    $this->postJson("/api/v1/listings/{$listing}/publish")
        ->assertOk()
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.vehicle_type', 'motorcycle')
        ->assertJsonPath('data.doors', null)
        ->assertJsonPath('data.seats', null);
});

it('saves a search for motorcycles and runs it as one', function (): void {
    $saved = $this->postJson('/api/v1/saved-searches', [
        'name' => 'Scooters in Skopje',
        'filters' => ['vehicle_type' => 'motorcycle', 'body_type' => ['scooter']],
    ])->assertCreated();

    expect($saved->json('data.filters.vehicle_type'))->toBe('motorcycle');

    // A saved search can never hold a filter search itself would reject, which
    // is why both go through the same rules.
    $this->postJson('/api/v1/saved-searches', [
        'filters' => ['vehicle_type' => 'motorcycle', 'body_type' => ['estate']],
    ])->assertStatus(422)->assertJsonValidationErrors('filters.body_type.0');
});

it('serves both shape vocabularies so the sell flow can ask the right question', function (): void {
    $response = $this->getJson('/api/v1/vocabularies')->assertOk();

    expect($response->json('data.vehicle_types'))->toBe(['car', 'motorcycle'])
        ->and($response->json('data.motorcycle_types'))->toContain('scooter', 'naked', 'moped', 'quad')
        ->and($response->json('data.body_types'))->toContain('estate', 'suv')
        ->and($response->json('data.body_types'))->not->toContain('scooter');
});
