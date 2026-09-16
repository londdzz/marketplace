<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Country>
 */
class CountryFactory extends Factory
{
    protected $model = Country::class;

    /**
     * The codes of the markets the seeders load. A generated country must never
     * land on one of these: the seeders and the factory would then fight over
     * the same primary key, which showed up as an occasional unique constraint
     * failure in tests that use both.
     *
     * @var array<int, string>
     */
    private const SEEDED = ['XK', 'AL', 'MK', 'RS', 'BG'];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => $this->unusedCode(),
            'currency' => 'EUR',
            'phone_prefix' => '+'.fake()->unique()->numberBetween(200, 998),
            'active' => true,
        ];
    }

    private function unusedCode(): string
    {
        do {
            $code = strtoupper(fake()->unique()->lexify('??'));
        } while (in_array($code, self::SEEDED, true));

        return $code;
    }
}
