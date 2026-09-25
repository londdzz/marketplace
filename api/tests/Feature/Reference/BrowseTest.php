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
use App\Services\BlockService;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    Cache::flush();

    $this->city = City::query()->where('country_code', 'MK')->firstOrFail();
    $this->make = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $this->model = VehicleModel::query()
        ->where('make_id', $this->make->id)
        ->where('name', 'Passat')
        ->firstOrFail();
});

/** A live listing a buyer could find, with sensible defaults to override. */
function browsable(array $attributes = []): Listing
{
    $seller = $attributes['seller'] ?? User::factory()->create([
        'country_code' => 'MK',
        'city_id' => test()->city->id,
    ]);
    unset($attributes['seller']);

    return Listing::factory()->active()->create(array_merge([
        'user_id' => $seller->id,
        'make_id' => test()->make->id,
        'model_id' => test()->model->id,
        'year' => 2015,
        'mileage_km' => 150000,
        'fuel' => FuelType::Diesel,
        'transmission' => Transmission::Manual,
        'body_type' => 'sedan',
        'price_eur' => '7500.00',
        'country_code' => 'MK',
        'city_id' => test()->city->id,
    ], $attributes));
}

it('offers the ways in without a token', function (): void {
    browsable(['fuel' => FuelType::Electric]);

    $this->getJson('/api/v1/browse')
        ->assertOk()
        ->assertJsonStructure(['data' => ['collections' => [['key', 'filters', 'count']], 'body_types' => [['key', 'count']]]]);
});

it('counts a collection against live listings rather than estimating', function (): void {
    // Three electrified cars a buyer can see, and three they cannot.
    browsable(['fuel' => FuelType::Electric]);
    browsable(['fuel' => FuelType::Hybrid]);
    browsable(['fuel' => FuelType::Electric]);

    browsable(['fuel' => FuelType::Diesel]);
    Listing::factory()->create([
        'status' => ListingStatus::Draft,
        'fuel' => FuelType::Electric,
        'make_id' => $this->make->id,
        'model_id' => $this->model->id,
    ]);
    Listing::factory()->expired()->create([
        'fuel' => FuelType::Electric,
        'make_id' => $this->make->id,
        'model_id' => $this->model->id,
    ]);

    $response = $this->getJson('/api/v1/browse')->assertOk();

    $electrified = collect($response->json('data.collections'))->firstWhere('key', 'electrified');

    expect($electrified['count'])->toBe(3)
        // The kind of vehicle rides along with the rest, so tapping a
        // collection runs exactly the search that was counted.
        ->and($electrified['filters'])->toBe(['fuel' => ['electric', 'hybrid'], 'vehicle_type' => 'car']);
});

it('leaves out a collection with nothing in it', function (): void {
    browsable(['fuel' => FuelType::Diesel]);

    $keys = collect($this->getJson('/api/v1/browse')->assertOk()->json('data.collections'))
        ->pluck('key')
        ->all();

    // An empty category is a worse tap than no category.
    expect($keys)->not->toContain('electrified');
});

it('puts the busiest collection first', function (): void {
    // One premium car, two electrified ones.
    browsable(['price_eur' => '22000.00', 'year' => 2020]);
    browsable(['fuel' => FuelType::Electric]);
    browsable(['fuel' => FuelType::Hybrid]);

    $keys = collect($this->getJson('/api/v1/browse')->assertOk()->json('data.collections'))
        ->pluck('key')
        ->all();

    expect(array_search('electrified', $keys, true))
        ->toBeLessThan(array_search('premium', $keys, true));
});

it('counts the body shapes that have cars in them', function (): void {
    browsable(['body_type' => 'suv']);
    browsable(['body_type' => 'suv']);
    browsable(['body_type' => 'hatchback']);

    $shapes = collect($this->getJson('/api/v1/browse')->assertOk()->json('data.body_types'))
        ->pluck('count', 'key')
        ->all();

    expect($shapes['suv'])->toBe(2)
        ->and($shapes['hatchback'])->toBe(1)
        ->and($shapes)->not->toHaveKey('pickup');
});

it('does not count a car belonging to someone the buyer blocked', function (): void {
    $buyer = User::factory()->create(['country_code' => 'MK', 'city_id' => $this->city->id]);
    $blocked = User::factory()->create(['country_code' => 'MK', 'city_id' => $this->city->id]);

    browsable(['body_type' => 'suv']);
    browsable(['body_type' => 'suv', 'seller' => $blocked]);

    // Everyone else still sees both.
    $shapes = collect($this->getJson('/api/v1/browse')->json('data.body_types'))->pluck('count', 'key');
    expect($shapes['suv'])->toBe(2);

    app(BlockService::class)->block($buyer, $blocked);

    $mine = collect($this->actingAs($buyer, 'sanctum')->getJson('/api/v1/browse')->assertOk()->json('data.body_types'))
        ->pluck('count', 'key');

    expect($mine['suv'])->toBe(1);
});

it('serves everyone who has blocked nobody the same cached answer', function (): void {
    browsable(['body_type' => 'suv']);

    $first = $this->getJson('/api/v1/browse')->assertOk()->json('data');

    // A car published after the cache was filled does not appear until it
    // expires, which is the bargain every reference endpoint here makes.
    browsable(['body_type' => 'suv']);

    expect($this->getJson('/api/v1/browse')->assertOk()->json('data'))->toBe($first);

    Cache::flush();

    $shapes = collect($this->getJson('/api/v1/browse')->json('data.body_types'))->pluck('count', 'key');
    expect($shapes['suv'])->toBe(2);
});

it('puts a car actually in the collection on its card', function (): void {
    $listing = browsable(['fuel' => FuelType::Electric]);
    $listing->photos()->create([
        'path' => 'listings/a.jpg',
        'thumb_path' => 'listings/a_thumb.jpg',
        'position' => 0,
        'width' => 1600,
        'height' => 1200,
    ]);

    $electrified = collect($this->getJson('/api/v1/browse')->assertOk()->json('data.collections'))
        ->firstWhere('key', 'electrified');

    expect($electrified['photo_url'])->toContain('listings/a_thumb.jpg');
});

it('shows no photograph rather than one belonging to another category', function (): void {
    // Every car listed without pictures: there is nothing honest to show.
    browsable(['fuel' => FuelType::Electric]);

    $electrified = collect($this->getJson('/api/v1/browse')->assertOk()->json('data.collections'))
        ->firstWhere('key', 'electrified');

    expect($electrified['photo_url'])->toBeNull();
});

it('gives each card its own car when there is one to spare', function (): void {
    foreach (['a', 'b'] as $index => $name) {
        $listing = browsable([
            'fuel' => FuelType::Electric,
            'body_type' => 'suv',
            'published_at' => now()->subMinutes($index),
        ]);
        $listing->photos()->create([
            'path' => "listings/{$name}.jpg",
            'thumb_path' => "listings/{$name}_thumb.jpg",
            'position' => 0,
            'width' => 1600,
            'height' => 1200,
        ]);
    }

    $data = $this->getJson('/api/v1/browse')->assertOk()->json('data');

    $collection = collect($data['collections'])->firstWhere('key', 'electrified');
    $shape = collect($data['body_types'])->firstWhere('key', 'suv');

    // Both categories hold both cars, so they take one each rather than
    // drawing the same photograph twice in a row.
    expect($collection['photo_url'])->not->toBe($shape['photo_url']);
});
