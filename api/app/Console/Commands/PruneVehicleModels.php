<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\VehicleType;
use App\Models\Make;
use App\Models\VehicleModel;
use Database\Seeders\Concerns\ReadsVehicleData;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Remove models the data files no longer name.
 *
 * `VehicleModelSeeder` only ever adds and updates, which is what makes it safe
 * to run on every deploy — and what leaves a renamed range behind under its old
 * name. Renaming BMW's "Series 3" to "3 Series" put both in the picker, and a
 * seller choosing between two spellings of the same car is choosing wrong half
 * the time.
 *
 * A model a listing points at is never deleted, whatever the data says: the
 * listing names a real car somebody is selling, and the row is what gives it
 * that name. Those are reported instead, so a rename that has already been used
 * is a thing a person decides about rather than something this does quietly.
 */
class PruneVehicleModels extends Command
{
    use ReadsVehicleData;

    protected $signature = 'models:prune {--dry-run : List what would go without deleting it}';

    protected $description = 'Delete unused model rows that the data files no longer name';

    public function handle(): int
    {
        $known = $this->known();
        $dryRun = (bool) $this->option('dry-run');

        $makes = Make::query()->pluck('name', 'id');
        $stale = [];
        $inUse = [];

        VehicleModel::query()
            ->withCount('listings')
            ->chunkById(500, function ($models) use ($known, $makes, &$stale, &$inUse): void {
                foreach ($models as $model) {
                    $make = $makes[$model->make_id] ?? null;

                    if ($make === null) {
                        continue;
                    }

                    $key = $make.'|'.$model->vehicle_type->value.'|'.$model->name;

                    if (isset($known[$key])) {
                        continue;
                    }

                    if ($model->listings_count > 0) {
                        $inUse[] = $model;
                    } else {
                        $stale[] = $model;
                    }
                }
            });

        foreach ($inUse as $model) {
            $this->warn(sprintf(
                'Kept %s %s (%s): %d listing(s) still name it.',
                $makes[$model->make_id], $model->name, $model->vehicle_type->value, $model->listings_count,
            ));
        }

        if ($stale === []) {
            $this->info('Nothing to prune.');

            return self::SUCCESS;
        }

        foreach ($stale as $model) {
            $this->line(sprintf(
                '%s %s %s (%s)',
                $dryRun ? 'Would remove' : 'Removed', $makes[$model->make_id], $model->name, $model->vehicle_type->value,
            ));
        }

        if ($dryRun) {
            $this->info(count($stale).' model(s) would be removed.');

            return self::SUCCESS;
        }

        VehicleModel::query()->whereKey(array_map(fn ($model) => $model->getKey(), $stale))->delete();

        // The model list for a make is cached for an hour, so without this the
        // command reports success and the picker keeps offering what it just
        // removed until the cache expires.
        foreach (array_unique(array_map(fn ($model) => $model->make_id, $stale)) as $makeId) {
            foreach (VehicleType::cases() as $type) {
                Cache::forget('reference:models:'.$makeId.':'.$type->value);
            }
        }

        $this->info(count($stale).' model(s) removed.');

        return self::SUCCESS;
    }

    /**
     * Every model the data files name, as "Make|kind|Model".
     *
     * @return array<string, true>
     */
    private function known(): array
    {
        $known = [];

        foreach (VehicleType::cases() as $type) {
            foreach ($this->vehicleData($type) as $make => $entry) {
                foreach (array_keys($entry['models']) as $name) {
                    $known[$make.'|'.$type->value.'|'.(string) $name] = true;
                }
            }
        }

        return $known;
    }
}
