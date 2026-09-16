<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SellerType;
use App\Models\City;
use App\Models\Country;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * Credits are deliberately never set here. A balance only ever changes through
 * App\Services\CreditService, so tests that need credits grant them with it.
 *
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'display_name' => fake()->name(),
            'email' => null,
            'password' => null,
            'phone' => '+383'.fake()->unique()->numerify('########'),
            'phone_verified_at' => Carbon::now(),
            'country_code' => Country::factory(),
            'city_id' => null,
            'preferred_language' => 'mk',
            'seller_type' => SellerType::Private,
            'dealer_name' => null,
        ];
    }

    public function dealer(): static
    {
        return $this->state(fn (array $attributes): array => [
            'seller_type' => SellerType::Dealer,
            'dealer_name' => fake()->company(),
        ]);
    }

    public function inCity(City $city): static
    {
        return $this->state(fn (array $attributes): array => [
            'country_code' => $city->country_code,
            'city_id' => $city->getKey(),
        ]);
    }

    public function blocked(): static
    {
        return $this->state(fn (array $attributes): array => [
            'blocked_at' => Carbon::now(),
        ]);
    }
}
