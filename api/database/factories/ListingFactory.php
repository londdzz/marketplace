<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\FuelType;
use App\Enums\ListingStatus;
use App\Enums\Transmission;
use App\Models\City;
use App\Models\Listing;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Listing>
 */
class ListingFactory extends Factory
{
    protected $model = Listing::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $make = Make::factory();

        return [
            'user_id' => User::factory(),
            'status' => ListingStatus::Draft,
            'make_id' => $make,
            'model_id' => fn (array $attributes): VehicleModel => VehicleModel::factory()
                ->create(['make_id' => $attributes['make_id']]),
            'variant' => null,
            'year' => fake()->numberBetween(2000, 2024),
            'mileage_km' => fake()->numberBetween(1_000, 400_000),
            'fuel' => fake()->randomElement(FuelType::cases()),
            'transmission' => fake()->randomElement(Transmission::cases()),
            'price_eur' => fake()->numberBetween(1_000, 40_000).'.00',
            'price_negotiable' => fake()->boolean(),
            'vat_deductible' => false,
            'customs_cleared' => true,
            'description' => fake()->sentence(),
            'features' => [],
            'city_id' => City::factory(),
            'country_code' => fn (array $attributes): string => City::findOrFail($attributes['city_id'])->country_code,
            'latitude' => fake()->latitude(40, 46),
            'longitude' => fake()->longitude(19, 28),
        ];
    }

    /**
     * A published listing, as ListingService::publish() would leave it.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ListingStatus::Active,
            'published_at' => Carbon::now(),
            'bumped_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addDays(14),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ListingStatus::Expired,
            'published_at' => Carbon::now()->subDays(20),
            'expires_at' => Carbon::now()->subDay(),
        ]);
    }
}
