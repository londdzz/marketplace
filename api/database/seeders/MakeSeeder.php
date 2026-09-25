<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\VehicleType;
use App\Models\Make;
use Database\Seeders\Concerns\ReadsVehicleData;
use Illuminate\Database\Seeder;

/**
 * Every make the marketplace knows about, cars and motorcycles together.
 *
 * A make carries a flag per kind rather than a type of its own, because BMW,
 * Honda, Peugeot, Piaggio and Suzuki sell both, and a flag per kind is also
 * what lets the make picker answer a different list depending on which
 * category the buyer or the seller is in.
 *
 * `popular` decides what leads the car picker and `popular_motorcycles` the
 * motorcycle one, which are not the same handful: Suzuki is an also-ran among
 * cars in this region and one of the first names in bikes.
 */
class MakeSeeder extends Seeder
{
    use ReadsVehicleData;

    public function run(): void
    {
        /** @var array<string, array{cars: bool, motorcycles: bool, popular: bool, popular_motorcycles: bool}> $makes */
        $makes = [];

        foreach (VehicleType::cases() as $type) {
            foreach ($this->vehicleData($type) as $name => $entry) {
                $makes[$name] ??= [
                    'cars' => false,
                    'motorcycles' => false,
                    'popular' => false,
                    'popular_motorcycles' => false,
                ];

                $makes[$name][$type === VehicleType::Motorcycle ? 'motorcycles' : 'cars'] = true;
                $makes[$name][$type === VehicleType::Motorcycle ? 'popular_motorcycles' : 'popular'] = (bool) $entry['popular'];
            }
        }

        foreach ($makes as $name => $flags) {
            Make::query()->updateOrCreate(['name' => $name], $flags);
        }
    }
}
