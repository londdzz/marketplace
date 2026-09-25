<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\VehicleType;
use App\Models\Make;
use App\Models\VehicleModel;
use App\Support\TextNormalizer;
use Database\Seeders\Concerns\ReadsVehicleData;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Every model of every make, with the shape its range is usually built in.
 *
 * A model belongs to exactly one kind of vehicle — an R 1250 GS is a
 * motorcycle and an X5 is a car, and nothing is both — so the kind lives on
 * the row, and the model picker asks for one kind at a time.
 *
 * The shape is validated against the vocabulary its kind allows, because a
 * typo here would put a shape in the column that no filter and no translation
 * key would ever match, and nothing downstream would complain.
 */
class VehicleModelSeeder extends Seeder
{
    use ReadsVehicleData;

    public function run(): void
    {
        foreach (VehicleType::cases() as $type) {
            $allowed = $type->bodyTypes();
            $makeIds = Make::query()->pluck('id', 'name');
            $rows = [];

            foreach ($this->vehicleData($type) as $makeName => $entry) {
                $makeId = $makeIds[$makeName] ?? null;

                if ($makeId === null) {
                    continue;
                }

                foreach ($entry['models'] as $name => $bodyType) {
                    // PHP turns a numeric array key into an int, and plenty of
                    // models are called nothing else: an Audi 80, a Peugeot
                    // 206, a Škoda 105.
                    $name = (string) $name;

                    if (! in_array($bodyType, $allowed, true)) {
                        throw new RuntimeException(sprintf(
                            '%s %s: "%s" is not one of the %s shapes.',
                            $makeName, $name, $bodyType, $type->value,
                        ));
                    }

                    $rows[] = [
                        'make_id' => $makeId,
                        'vehicle_type' => $type->value,
                        'name' => $name,
                        // Normalized here rather than by the model's saving
                        // hook, because these go in as one statement per
                        // thousand rows instead of one per row: two and a half
                        // thousand saves is three seconds on every test that
                        // needs a make.
                        'name_normalized' => TextNormalizer::normalize($name),
                        'body_type' => $bodyType,
                    ];
                }
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                VehicleModel::query()->upsert(
                    $chunk,
                    ['make_id', 'vehicle_type', 'name'],
                    ['name_normalized', 'body_type'],
                );
            }
        }
    }
}
