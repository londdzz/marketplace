<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Make;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Make>
 */
class MakeFactory extends Factory
{
    protected $model = Make::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ucfirst(fake()->unique()->word()),
            'popular' => false,
        ];
    }

    public function popular(): static
    {
        return $this->state(fn (array $attributes): array => ['popular' => true]);
    }
}
