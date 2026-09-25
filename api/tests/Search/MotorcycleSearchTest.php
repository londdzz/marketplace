<?php

declare(strict_types=1);

use App\Enums\FuelType;
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

/**
 * Cars and motorcycles live in one table and never mix in one set of results.
 *
 * The rule the whole feature rests on: a search that does not say which kind it
 * wants means cars, because that is what every search meant before motorcycles
 * existed and what every client that has not been updated is still asking for.
 */
beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $this->skopje = City::query()->where('name', 'Skopje')->firstOrFail();
});

function vehicle(string $make, string $model, string $type, array $attributes = []): Listing
{
    $makeRow = Make::query()->where('name', $make)->firstOrFail();
    $modelRow = VehicleModel::query()
        ->where('make_id', $makeRow->id)
        ->where('name', $model)
        ->where('vehicle_type', $type)
        ->firstOrFail();

    $city = test()->skopje;

    return Listing::factory()->active()->create(array_merge([
        'user_id' => User::factory()->create(['country_code' => $city->country_code])->id,
        'vehicle_type' => $type,
        'make_id' => $makeRow->id,
        'model_id' => $modelRow->id,
        'body_type' => $modelRow->body_type,
        'year' => 2018,
        'mileage_km' => 30000,
        'fuel' => FuelType::Petrol,
        'transmission' => Transmission::Manual,
        'price_eur' => '5000.00',
        'country_code' => $city->country_code,
        'city_id' => $city->id,
        'latitude' => $city->latitude,
        'longitude' => $city->longitude,
    ], $attributes));
}

it('returns only cars when nothing says otherwise', function (): void {
    vehicle('Volkswagen', 'Golf', 'car');
    vehicle('Yamaha', 'MT-07', 'motorcycle');

    $response = $this->getJson('/api/v1/listings')->assertOk()->assertJsonCount(1, 'data');

    expect($response->json('data.0.vehicle_type'))->toBe('car')
        ->and($response->json('data.0.model.name'))->toBe('Golf');
});

it('returns only motorcycles when asked for them', function (): void {
    vehicle('Volkswagen', 'Golf', 'car');
    vehicle('Yamaha', 'MT-07', 'motorcycle');
    vehicle('Honda', 'PCX 125', 'motorcycle');

    $response = $this->getJson('/api/v1/listings?vehicle_type=motorcycle')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    expect(array_column($response->json('data'), 'vehicle_type'))->toBe(['motorcycle', 'motorcycle']);
});

it('keeps a make that sells both from leaking across the two', function (): void {
    // BMW is exactly the case the flag-per-kind design exists for.
    vehicle('BMW', 'X5', 'car');
    vehicle('BMW', 'R 1250 GS', 'motorcycle');

    $bmw = Make::query()->where('name', 'BMW')->firstOrFail();

    $cars = $this->getJson("/api/v1/listings?make_id={$bmw->id}")->assertOk()->json('data');
    $bikes = $this->getJson("/api/v1/listings?vehicle_type=motorcycle&make_id={$bmw->id}")->assertOk()->json('data');

    expect($cars)->toHaveCount(1)
        ->and($cars[0]['model']['name'])->toBe('X5')
        ->and($bikes)->toHaveCount(1)
        ->and($bikes[0]['model']['name'])->toBe('R 1250 GS');
});

it('searches a motorcycle by name, in either script', function (): void {
    vehicle('Honda', 'PCX 125', 'motorcycle');

    // Хонда and Honda are the same search, the same way Пасат and Passat are.
    // Yamaha is not in this list on purpose: Јамаха transliterates to "jamaha"
    // and the Latin spelling starts with a "y", so the two genuinely do not
    // meet. That is transliteration, not a bug in the kind filter.
    foreach (['Honda', 'Хонда', 'honda'] as $query) {
        $this->getJson('/api/v1/listings?vehicle_type=motorcycle&q='.urlencode($query))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
});

it('narrows motorcycles by their own shapes', function (): void {
    vehicle('Honda', 'PCX 125', 'motorcycle');   // scooter
    vehicle('Yamaha', 'MT-07', 'motorcycle');    // naked

    $this->getJson('/api/v1/listings?vehicle_type=motorcycle&body_type[]=scooter')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.body_type', 'scooter');
});

it('refuses a car shape on a motorcycle search, and the other way round', function (): void {
    $this->getJson('/api/v1/listings?vehicle_type=motorcycle&body_type[]=estate')
        ->assertStatus(422)
        ->assertJsonValidationErrors('body_type.0');

    $this->getJson('/api/v1/listings?body_type[]=scooter')
        ->assertStatus(422)
        ->assertJsonValidationErrors('body_type.0');
});

it('offers the motorcycle collections and shapes when browsing bikes', function (): void {
    vehicle('Honda', 'PCX 125', 'motorcycle', ['price_eur' => '1200.00']);
    vehicle('Volkswagen', 'Golf', 'car');

    $bikes = $this->getJson('/api/v1/browse?type=motorcycle')->assertOk()->json('data');
    $cars = $this->getJson('/api/v1/browse')->assertOk()->json('data');

    expect(array_column($bikes['collections'], 'key'))
        ->toContain('first_bike', 'two_wheel_commuter')
        ->and(array_column($bikes['body_types'], 'key'))->toBe(['scooter'])
        // Every number is counted against live listings of that kind alone.
        ->and(array_column($bikes['body_types'], 'count'))->toBe([1])
        ->and(array_column($cars['body_types'], 'key'))->toBe(['hatchback'])
        ->and(array_column($cars['collections'], 'key'))->not->toContain('first_bike');
});
