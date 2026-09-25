<?php

declare(strict_types=1);

use App\Models\City;
use App\Models\Country;
use App\Models\Make;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\ExchangeRateSeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);
    $this->seed(ExchangeRateSeeder::class);
});

it('lists the open markets without a token', function (): void {
    $response = $this->getJson('/api/v1/countries')
        ->assertOk()
        ->assertJsonStructure(['data' => [['code', 'currency', 'phone_prefix']]]);

    // Launch is North Macedonia alone.
    expect(array_column($response->json('data'), 'code'))->toBe(['MK']);
});

it('keeps the markets that are not open yet, hidden rather than missing', function (): void {
    // Expansion is flipping a flag, so the rows, their cities and their
    // dialling prefixes are already in the database.
    expect(Country::query()->count())->toBe(5)
        ->and(Country::query()->where('active', false)->pluck('code')->sort()->values()->all())
        ->toBe(['AL', 'BG', 'RS', 'XK']);

    Country::query()->where('code', 'XK')->update(['active' => true]);
    Cache::flush();

    $codes = array_column($this->getJson('/api/v1/countries')->json('data'), 'code');

    expect($codes)->toContain('XK')->toContain('MK');
});

it('lists cities for one country, largest first', function (): void {
    $response = $this->getJson('/api/v1/cities?country=MK')
        ->assertOk()
        ->assertJsonCount(6, 'data');

    $names = array_column($response->json('data'), 'name');

    expect($names[0])->toBe('Skopje')
        ->and(array_unique(array_column($response->json('data'), 'country_code')))->toBe(['MK']);
});

it('lists the cities of every open market when no country is named', function (): void {
    // Not all thirty: the four closed markets' towns are in the database and
    // stay out of the answer, the same way /countries leaves the countries out.
    // Offering one meant a sell form whose location the API then refused.
    $response = $this->getJson('/api/v1/cities')
        ->assertOk()
        ->assertJsonCount(6, 'data');

    expect(array_unique(array_column($response->json('data'), 'country_code')))->toBe(['MK']);
});

it('serves no cities for a market that is not open yet', function (): void {
    expect(City::query()->where('country_code', 'AL')->count())->toBeGreaterThan(0);

    $this->getJson('/api/v1/cities?country=AL')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('serves a market\'s cities the day it opens', function (): void {
    Country::query()->where('code', 'AL')->update(['active' => true]);
    Cache::flush();

    $this->getJson('/api/v1/cities?country=AL')
        ->assertOk()
        ->assertJsonCount(City::query()->where('country_code', 'AL')->count(), 'data');
});

it('rejects a country that does not exist', function (): void {
    $this->getJson('/api/v1/cities?country=ZZ')
        ->assertStatus(422)
        ->assertJsonValidationErrors('country');
});

it('lists makes with the popular ones first', function (): void {
    $response = $this->getJson('/api/v1/makes')->assertOk();

    $makes = $response->json('data');
    $first = array_slice($makes, 0, 10);

    expect($makes)->toHaveCount(Make::query()->where('cars', true)->count())
        ->and(array_column($first, 'popular'))->each->toBeTrue()
        ->and(array_column($first, 'name'))->toContain('Volkswagen', 'Škoda', 'Toyota');
});

it('lists motorcycle makes, led by the ones popular for bikes', function (): void {
    $response = $this->getJson('/api/v1/makes?type=motorcycle')->assertOk();

    $names = array_column($response->json('data'), 'name');
    $popular = array_column(array_slice($response->json('data'), 0, 13), 'name');

    expect($names)->toContain('Yamaha', 'Vespa', 'Tomos')
        // A car make with no bikes has no business in this list.
        ->and($names)->not->toContain('Volkswagen', 'Škoda')
        // Suzuki leads here and does not lead the car list: which makes come
        // first is a different answer per kind.
        ->and($popular)->toContain('Suzuki', 'Piaggio')
        ->and(array_column($this->getJson('/api/v1/makes')->json('data'), 'name'))
        ->not->toContain('Vespa');
});

it('says which kinds of vehicle a make sells', function (): void {
    $makes = collect($this->getJson('/api/v1/makes')->assertOk()->json('data'))
        ->keyBy('name');

    expect($makes['Volkswagen']['sells'])->toBe(['car'])
        // BMW sells both, which is the whole reason a make carries a flag per
        // kind rather than a type of its own.
        ->and($makes['BMW']['sells'])->toBe(['car', 'motorcycle']);
});

it('rejects a kind of vehicle it does not have', function (): void {
    $this->getJson('/api/v1/makes?type=lorry')
        ->assertStatus(422)
        ->assertJsonValidationErrors('type');
});

it('lists the models of one make', function (): void {
    $make = Make::query()->where('name', 'Volkswagen')->firstOrFail();

    $response = $this->getJson("/api/v1/makes/{$make->id}/models")->assertOk();

    $names = array_column($response->json('data'), 'name');

    expect($names)->toContain('Golf', 'Passat')
        ->and(array_unique(array_column($response->json('data'), 'make_id')))->toBe([$make->id]);
});

it('keeps a make that sells both from mixing its cars and its bikes', function (): void {
    $bmw = Make::query()->where('name', 'BMW')->firstOrFail();

    $cars = array_column($this->getJson("/api/v1/makes/{$bmw->id}/models")->assertOk()->json('data'), 'name');
    $bikes = array_column($this->getJson("/api/v1/makes/{$bmw->id}/models?type=motorcycle")->assertOk()->json('data'), 'name');

    expect($cars)->toContain('X5')->not->toContain('R 1250 GS')
        ->and($bikes)->toContain('R 1250 GS')->not->toContain('X5')
        ->and(array_intersect($cars, $bikes))->toBe([]);
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
    $before = count($this->getJson('/api/v1/makes')->assertOk()->json('data'));

    Make::query()->where('name', 'Volkswagen')->delete();

    $this->getJson('/api/v1/makes')
        ->assertOk()
        ->assertJsonCount($before, 'data');
});

it('publishes the closed vocabularies the sell flow picks from', function (): void {
    $response = $this->getJson('/api/v1/vocabularies')
        ->assertOk()
        ->assertJsonStructure(['data' => ['body_types', 'drivetrains', 'colors', 'features']]);

    // The apps translate these keys, so the API and the app must agree on
    // exactly what the set is.
    expect($response->json('data.features'))->toBe(config('listings.features'))
        ->and($response->json('data.body_types'))->toBe(config('listings.body_types'))
        ->and($response->json('data.colors'))->toBe(config('listings.colors'))
        ->and($response->json('data.drivetrains'))->toBe(config('listings.drivetrains'));
});
