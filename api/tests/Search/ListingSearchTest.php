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
use Illuminate\Support\Carbon;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $this->vw = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $this->audi = Make::query()->where('name', 'Audi')->firstOrFail();
    $this->passat = VehicleModel::query()->where('make_id', $this->vw->id)->where('name', 'Passat')->firstOrFail();
    $this->golf = VehicleModel::query()->where('make_id', $this->vw->id)->where('name', 'Golf')->firstOrFail();
    $this->a4 = VehicleModel::query()->where('make_id', $this->audi->id)->where('name', 'A4')->firstOrFail();

    $this->prishtina = City::query()->where('name', 'Prishtinë')->firstOrFail();
    $this->sofia = City::query()->where('name', 'Sofia')->firstOrFail();
});

/**
 * A live listing, positioned somewhere real.
 */
function liveListing(array $attributes = []): Listing
{
    $city = $attributes['city'] ?? test()->prishtina;
    unset($attributes['city']);

    $seller = User::factory()->create(['country_code' => $city->country_code]);

    return Listing::factory()->active()->create(array_merge([
        'user_id' => $seller->id,
        'make_id' => test()->vw->id,
        'model_id' => test()->passat->id,
        'year' => 2015,
        'mileage_km' => 150000,
        'fuel' => FuelType::Diesel,
        'transmission' => Transmission::Manual,
        'price_eur' => '7500.00',
        'country_code' => $city->country_code,
        'city_id' => $city->id,
        'latitude' => $city->latitude,
        'longitude' => $city->longitude,
    ], $attributes));
}

it('returns live listings to anyone, without a token', function (): void {
    liveListing();

    $this->getJson('/api/v1/listings')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonStructure(['data', 'links', 'meta']);
});

it('shows only live listings', function (): void {
    liveListing();
    Listing::factory()->create(['status' => ListingStatus::Draft, 'make_id' => $this->vw->id, 'model_id' => $this->passat->id]);
    Listing::factory()->expired()->create(['make_id' => $this->vw->id, 'model_id' => $this->passat->id]);
    Listing::factory()->create(['status' => ListingStatus::Sold, 'make_id' => $this->vw->id, 'model_id' => $this->passat->id]);

    $this->getJson('/api/v1/listings')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('finds the same cars whether the query is Cyrillic or Latin', function (): void {
    $passat = liveListing();
    liveListing(['model_id' => $this->golf->id]);

    $results = [];

    foreach (['Пасат', 'Passat', 'passat', 'pasat', 'PASSAT'] as $query) {
        $response = $this->getJson('/api/v1/listings?q='.urlencode($query))->assertOk();

        $results[$query] = array_column($response->json('data'), 'id');
    }

    foreach ($results as $query => $ids) {
        expect($ids)->toBe([$passat->id], "query [{$query}] found something else");
    }
});

it('matches a make written in either script', function (): void {
    $audi = liveListing(['make_id' => $this->audi->id, 'model_id' => $this->a4->id]);
    liveListing();

    $latin = array_column($this->getJson('/api/v1/listings?q=audi')->json('data'), 'id');
    $cyrillic = array_column($this->getJson('/api/v1/listings?q='.urlencode('Ауди'))->json('data'), 'id');

    expect($latin)->toBe([$audi->id])
        ->and($cyrillic)->toBe([$audi->id]);
});

it('cannot bridge a name that is spelled differently in the two alphabets', function (): void {
    // Volkswagen is written phonetically in Cyrillic, so it normalizes to
    // "folksvagen" and cannot meet the Latin "volkswagen". Transliteration
    // carries spelling across alphabets, not pronunciation, and a buyer typing
    // this finds the car through the make filter instead.
    liveListing();

    $this->getJson('/api/v1/listings?q='.urlencode('Фолксваген'))
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('ignores diacritics in the query', function (): void {
    $listing = liveListing(['description' => 'Makina është në gjendje të shkëlqyer']);

    $withMarks = array_column($this->getJson('/api/v1/listings?q='.urlencode('shkëlqyer'))->json('data'), 'id');
    $without = array_column($this->getJson('/api/v1/listings?q=shkelqyer')->json('data'), 'id');

    expect($withMarks)->toBe([$listing->id])
        ->and($without)->toBe([$listing->id]);
});

it('finds a short model name the fulltext index will not hold', function (): void {
    $a4 = liveListing(['make_id' => $this->audi->id, 'model_id' => $this->a4->id]);
    liveListing();

    $ids = array_column($this->getJson('/api/v1/listings?q=a4')->json('data'), 'id');

    expect($ids)->toBe([$a4->id]);
});

it('requires every word of the query to match', function (): void {
    $diesel = liveListing(['description' => 'full service history']);
    liveListing(['model_id' => $this->golf->id, 'description' => 'full service history']);

    $ids = array_column($this->getJson('/api/v1/listings?q='.urlencode('passat service'))->json('data'), 'id');

    expect($ids)->toBe([$diesel->id]);
});

it('returns nothing for a query that matches nothing', function (): void {
    liveListing();

    $this->getJson('/api/v1/listings?q=lamborghini')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('narrows by every filter it offers', function (array $query, int $expected): void {
    liveListing();
    liveListing([
        'make_id' => $this->audi->id,
        'model_id' => $this->a4->id,
        'year' => 2020,
        'mileage_km' => 40000,
        'fuel' => FuelType::Petrol,
        'transmission' => Transmission::Automatic,
        'body_type' => 'suv',
        'price_eur' => '25000.00',
        'city' => $this->sofia,
    ]);

    $this->getJson('/api/v1/listings?'.http_build_query($query))
        ->assertOk()
        ->assertJsonCount($expected, 'data');
})->with([
    'no filter' => [[], 2],
    'year from' => [['year_min' => 2018], 1],
    'year to' => [['year_max' => 2016], 1],
    'price from' => [['price_min' => 10000], 1],
    'price to' => [['price_max' => 10000], 1],
    'mileage' => [['mileage_max' => 50000], 1],
    'one fuel' => [['fuel' => ['petrol']], 1],
    'both fuels' => [['fuel' => ['petrol', 'diesel']], 2],
    'transmission' => [['transmission' => 'automatic'], 1],
    'body type' => [['body_type' => 'suv'], 1],
    'one country' => [['countries' => ['BG']], 1],
    'both countries' => [['countries' => ['BG', 'XK']], 2],
]);

it('narrows by make', function (): void {
    $vw = liveListing();
    liveListing(['make_id' => $this->audi->id, 'model_id' => $this->a4->id]);

    $ids = array_column($this->getJson('/api/v1/listings?make_id='.$this->vw->id)->json('data'), 'id');

    expect($ids)->toBe([$vw->id]);
});

it('narrows by model', function (): void {
    $passat = liveListing();
    liveListing(['model_id' => $this->golf->id]);

    $ids = array_column($this->getJson('/api/v1/listings?model_id='.$this->passat->id)->json('data'), 'id');

    expect($ids)->toBe([$passat->id]);
});

it('narrows by city', function (): void {
    $home = liveListing();
    liveListing(['city' => $this->sofia]);

    $ids = array_column($this->getJson('/api/v1/listings?city_id='.$this->prishtina->id)->json('data'), 'id');

    expect($ids)->toBe([$home->id]);
});

it('combines filters rather than widening', function (): void {
    liveListing();
    $match = liveListing(['model_id' => $this->golf->id, 'year' => 2019, 'price_eur' => '12000.00']);
    liveListing(['model_id' => $this->golf->id, 'year' => 2010, 'price_eur' => '3000.00']);

    $ids = array_column($this->getJson(
        '/api/v1/listings?'.http_build_query(['model_id' => $this->golf->id, 'year_min' => 2015, 'price_max' => 15000])
    )->json('data'), 'id');

    expect($ids)->toBe([$match->id]);
});

it('finds cars within a radius and leaves out the ones beyond it', function (): void {
    $near = liveListing();
    $far = liveListing(['city' => $this->sofia]);

    // Prishtina to Sofia is roughly 300km.
    $close = array_column($this->getJson('/api/v1/listings?'.http_build_query([
        'lat' => 42.6629, 'lng' => 21.1655, 'radius_km' => 50,
    ]))->json('data'), 'id');

    $wide = array_column($this->getJson('/api/v1/listings?'.http_build_query([
        'lat' => 42.6629, 'lng' => 21.1655, 'radius_km' => 400,
    ]))->json('data'), 'id');

    expect($close)->toBe([$near->id])
        ->and($wide)->toHaveCount(2)
        ->and($wide)->toContain($far->id);
});

it('measures a radius from a city when no coordinates are given', function (): void {
    $near = liveListing();
    liveListing(['city' => $this->sofia]);

    $ids = array_column($this->getJson('/api/v1/listings?'.http_build_query([
        'city_id' => $this->prishtina->id, 'radius_km' => 50,
    ]))->json('data'), 'id');

    expect($ids)->toBe([$near->id]);
});

it('refuses a radius with nothing to measure from', function (): void {
    $this->getJson('/api/v1/listings?radius_km=50')
        ->assertStatus(422)
        ->assertJsonValidationErrors('radius_km');
});

it('refuses half a coordinate pair', function (): void {
    $this->getJson('/api/v1/listings?lat=42.6&radius_km=50')
        ->assertStatus(422)
        ->assertJsonValidationErrors('lat');
});

it('sorts by price, mileage and recency on request', function (string $sort, string $field, array $expected): void {
    liveListing(['price_eur' => '9000.00', 'mileage_km' => 100000, 'published_at' => Carbon::now()->subDays(3)]);
    liveListing(['price_eur' => '3000.00', 'mileage_km' => 250000, 'published_at' => Carbon::now()->subDay()]);
    liveListing(['price_eur' => '6000.00', 'mileage_km' => 50000, 'published_at' => Carbon::now()->subDays(2)]);

    $values = array_column($this->getJson('/api/v1/listings?sort='.$sort)->json('data'), $field);

    expect($values)->toBe($expected);
})->with([
    ['price_asc', 'price_eur', ['3000.00', '6000.00', '9000.00']],
    ['price_desc', 'price_eur', ['9000.00', '6000.00', '3000.00']],
    ['mileage_asc', 'mileage_km', [50000, 100000, 250000]],
]);

it('puts the most recently published first when asked for newest', function (): void {
    $old = liveListing(['published_at' => Carbon::now()->subDays(5)]);
    $new = liveListing(['published_at' => Carbon::now()->subHour()]);

    $ids = array_column($this->getJson('/api/v1/listings?sort=newest')->json('data'), 'id');

    expect($ids)->toBe([$new->id, $old->id]);
});

it('leads with featured listings and then the most recently bumped', function (): void {
    $bumpedFirst = liveListing(['bumped_at' => Carbon::now()->subDay()]);
    $bumpedLast = liveListing(['bumped_at' => Carbon::now()->subDays(5)]);
    $featured = liveListing([
        'bumped_at' => Carbon::now()->subDays(10),
        'featured_until' => Carbon::now()->addDays(3),
    ]);

    $ids = array_column($this->getJson('/api/v1/listings')->json('data'), 'id');

    expect($ids)->toBe([$featured->id, $bumpedFirst->id, $bumpedLast->id]);
});

it('ignores a feature period that has run out', function (): void {
    $bumped = liveListing(['bumped_at' => Carbon::now()->subDay()]);
    $wasFeatured = liveListing([
        'bumped_at' => Carbon::now()->subDays(5),
        'featured_until' => Carbon::now()->subDay(),
    ]);

    $ids = array_column($this->getJson('/api/v1/listings')->json('data'), 'id');

    expect($ids)->toBe([$bumped->id, $wasFeatured->id]);
});

it('pages through the results', function (): void {
    foreach (range(1, 7) as $index) {
        liveListing(['bumped_at' => Carbon::now()->subMinutes($index)]);
    }

    $first = $this->getJson('/api/v1/listings?per_page=3')->assertOk();
    $second = $this->getJson('/api/v1/listings?per_page=3&page=2')->assertOk();

    expect($first->json('data'))->toHaveCount(3)
        ->and($second->json('data'))->toHaveCount(3)
        ->and($first->json('meta.total'))->toBe(7)
        ->and($first->json('meta.last_page'))->toBe(3)
        ->and(array_column($first->json('data'), 'id'))
        ->not->toEqual(array_column($second->json('data'), 'id'));
});

it('rejects a sort it does not have', function (): void {
    $this->getJson('/api/v1/listings?sort=cheapest')
        ->assertStatus(422)
        ->assertJsonValidationErrors('sort');
});

it('rejects filter values outside the vocabularies', function (string $query, string $field): void {
    $this->getJson('/api/v1/listings?'.$query)
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);
})->with([
    ['fuel[]=nuclear', 'fuel.0'],
    ['transmission=cvt', 'transmission'],
    ['body_type=spaceship', 'body_type'],
    ['countries[]=ZZ', 'countries.0'],
    ['make_id=999999', 'make_id'],
    ['radius_km=9999&lat=42&lng=21', 'radius_km'],
]);

it('carries the photos and the cross-border country on every result', function (): void {
    liveListing(['city' => $this->sofia]);

    $this->getJson('/api/v1/listings')
        ->assertOk()
        ->assertJsonPath('data.0.country_code', 'BG')
        ->assertJsonStructure(['data' => [['id', 'price_eur', 'country_code', 'city', 'photos', 'photo_count']]]);
});
