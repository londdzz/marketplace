<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\City;
use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    protected $model = City::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->city();

        return [
            'country_code' => Country::factory(),
            'name' => $name,
            'latitude' => fake()->latitude(40, 46),
            'longitude' => fake()->longitude(19, 28),
            'population' => fake()->numberBetween(10_000, 1_500_000),
        ];
    }
}
