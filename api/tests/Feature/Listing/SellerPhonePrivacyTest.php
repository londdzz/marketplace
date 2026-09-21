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

/**
 * A seller's telephone number is the one piece of personal data the
 * marketplace publishes, and reading a listing needs no account. These say it
 * still takes one to see the number.
 */
beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $city = City::query()->where('country_code', 'MK')->firstOrFail();
    $make = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $model = VehicleModel::query()->where('make_id', $make->id)->firstOrFail();

    $this->seller = User::factory()->create([
        'country_code' => 'MK',
        'city_id' => $city->id,
        'phone' => '+38970111222',
    ]);

    $this->listing = Listing::factory()->create([
        'user_id' => $this->seller->id,
        'status' => ListingStatus::Active,
        'make_id' => $make->id,
        'model_id' => $model->id,
        'year' => 2018,
        'mileage_km' => 90000,
        'fuel' => FuelType::Diesel,
        'transmission' => Transmission::Manual,
        'price_eur' => '12000.00',
        'country_code' => 'MK',
        'city_id' => $city->id,
        'published_at' => now(),
        'expires_at' => now()->addDays(14),
    ]);
});

it('does not give a signed-out caller the seller phone number', function (): void {
    $response = $this->getJson("/api/v1/listings/{$this->listing->id}")->assertOk();

    expect($response->json('data.seller'))->not->toBeNull()
        ->and($response->json('data.seller'))->not->toHaveKey('phone');
});

it('gives a signed-in caller the seller phone number', function (): void {
    $buyer = User::factory()->create(['country_code' => 'MK']);

    $this->actingAs($buyer, 'sanctum')
        ->getJson("/api/v1/listings/{$this->listing->id}")
        ->assertOk()
        ->assertJsonPath('data.seller.phone', '+38970111222');
});

it('does not leak phone numbers through the public search results', function (): void {
    // The whole point: search carries the seller on every row, so one page of
    // results would otherwise hand over a page of telephone numbers.
    $response = $this->getJson('/api/v1/listings')->assertOk();

    expect($response->getContent())->not->toContain('+38970111222');
});

it('still carries the name and kind of seller for a signed-out caller', function (): void {
    // Gating the number must not take the rest of the seller block with it:
    // the card shows who is selling, it just cannot ring them.
    $this->getJson("/api/v1/listings/{$this->listing->id}")
        ->assertOk()
        ->assertJsonPath('data.seller.id', $this->seller->id)
        ->assertJsonPath('data.seller.display_name', $this->seller->display_name);
});
