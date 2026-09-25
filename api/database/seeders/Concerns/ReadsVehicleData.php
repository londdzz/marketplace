<?php

declare(strict_types=1);

namespace Database\Seeders\Concerns;

use App\Enums\VehicleType;
use RuntimeException;

/**
 * The make and model lists live in database/data rather than inside a seeder,
 * because there are well over two thousand rows between them and a seeder
 * whose body is a wall of data is a seeder nobody reads.
 */
trait ReadsVehicleData
{
    /**
     * @return array<string, array{popular: bool, models: array<string, string>}>
     */
    protected function vehicleData(VehicleType $type): array
    {
        $path = database_path('data/'.match ($type) {
            VehicleType::Car => 'cars.php',
            VehicleType::Motorcycle => 'motorcycles.php',
        });

        if (! is_file($path)) {
            throw new RuntimeException('Missing vehicle data file: '.$path);
        }

        /** @var array<string, array{popular: bool, models: array<string, string>}> $data */
        $data = require $path;

        return $data;
    }
}
