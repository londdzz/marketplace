<?php

declare(strict_types=1);

use App\Models\Make;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\ExchangeRateSeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);
    $this->seed(ExchangeRateSeeder::class);
});

it('lists the five markets without a token', function (): void {
    $response = $this->getJson('/api/v1/countries')
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonStructure(['data' => [['code', 'currency', 'phone_prefix']]]);

    expect(array_column($response->json('data'), 'code'))
        ->toBe(['AL', 'BG', 'MK', 'RS', 'XK']);
});

it('lists cities for one country, largest first', function (): void {
    $response = $this->getJson('/api/v1/cities?country=MK')
        ->assertOk()
        ->assertJsonCount(6, 'data');

    $names = array_column($response->json('data'), 'name');

    expect($names[0])->toBe('Skopje')
        ->and(array_unique(array_column($response->json('data'), 'country_code')))->toBe(['MK']);
});

it('lists every city when no country is named', function (): void {
    $this->getJson('/api/v1/cities')
        ->assertOk()
        ->assertJsonCount(30, 'data');
});

it('rejects a country that does not exist', function (): void {
    $this->getJson('/api/v1/cities?country=ZZ')
        ->assertStatus(422)
        ->assertJsonValidationErrors('country');
});

it('lists makes with the popular ones first', function (): void {
    $response = $this->getJson('/api/v1/makes')
        ->assertOk()
        ->assertJsonCount(40, 'data');

    $first = array_slice($response->json('data'), 0, 10);

    expect(array_column($first, 'popular'))->each->toBeTrue()
        ->and(array_column($first, 'name'))->toContain('Volkswagen', 'Škoda', 'Toyota');
});

it('lists the models of one make', function (): void {
    $make = Make::query()->where('name', 'Volkswagen')->firstOrFail();

    $response = $this->getJson("/api/v1/makes/{$make->id}/models")->assertOk();

    $names = array_column($response->json('data'), 'name');

    expect($names)->toContain('Golf', 'Passat')
        ->and(array_unique(array_column($response->json('data'), 'make_id')))->toBe([$make->id]);
});

it('gives 404 for a make that does not exist', function (): void {
    $this->getJson('/api/v1/makes/999999/models')->assertStatus(404);
});

it('publishes the exchange rates used for local-currency display', function (): void {
    $response = $this->getJson('/api/v1/exchange-rates')
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonStructure(['data' => [['currency', 'rate_per_eur', 'updated_at']]]);

    $rates = array_column($response->json('data'), 'rate_per_eur', 'currency');

    expect($rates['EUR'])->toBe('1.000000')
        ->and($rates)->toHaveKeys(['ALL', 'MKD', 'RSD', 'BGN']);
});

it('serves reference data from cache on the second call', function (): void {
    $this->getJson('/api/v1/makes')->assertOk();

    Make::query()->where('name', 'Volkswagen')->delete();

    $this->getJson('/api/v1/makes')
        ->assertOk()
        ->assertJsonCount(40, 'data');
});
