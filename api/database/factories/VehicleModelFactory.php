<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Make;
use App\Models\VehicleModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VehicleModel>
 */
class VehicleModelFactory extends Factory
{
    protected $model = VehicleModel::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'make_id' => Make::factory(),
            'name' => ucfirst(fake()->unique()->word()),
            'body_type' => null,
        ];
    }
}
