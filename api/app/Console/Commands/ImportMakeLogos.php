<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\VehicleType;
use App\Models\Make;
use App\Support\TextNormalizer;
use Illuminate\Console\Command;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * Puts the manufacturer marks on the storage disk and attaches them to makes.
 *
 * The marks live in resources/make-logos and are committed, because Simple
 * Icons publishes them CC0 and there is nothing to honour in redistributing
 * them. So a fresh checkout needs this one command and no Node: anything in
 * that directory is copied onto the disk first, and then everything in makes/
 * is matched to a make by its normalised name, so "Škoda" finds skoda.png.
 *
 * A file dropped straight into makes/ on the disk still works, which is how a
 * mark can be added without touching the repository.
 */
class ImportMakeLogos extends Command
{
    protected $signature = 'makes:logos {--directory=makes}';

    protected $description = 'Attach logo files on the storage disk to their makes';

    public function handle(): int
    {
        $disk = Storage::disk((string) config('filesystems.default'));
        $directory = (string) $this->option('directory');

        $copied = $this->seedFromResources($disk, $directory);

        if ($copied > 0) {
            $this->line("Copied {$copied} marks onto the ".config('filesystems.default').' disk.');
        }

        $files = $disk->files($directory);

        if ($files === []) {
            $this->warn("No files found in [{$directory}] on the ".config('filesystems.default').' disk.');
            $this->line('Marks ship in resources/make-logos; this copies them across on its own.');

            return self::SUCCESS;
        }

        $byName = Make::query()->get()->keyBy(
            fn (Make $make): string => TextNormalizer::normalize($make->name)
        );

        $linked = 0;

        foreach ($files as $file) {
            $slug = TextNormalizer::normalize(pathinfo($file, PATHINFO_FILENAME));
            $make = $byName->get($slug);

            if (! $make instanceof Make) {
                $this->warn("No make matches [{$file}].");

                continue;
            }

            $make->forceFill(['logo_path' => $file])->save();
            $linked++;
        }

        // /makes is cached for an hour, so without this the command reports
        // success and every make keeps drawing its monogram until the cache
        // expires — the linking looking like it did nothing at all.
        // One cached list per kind of vehicle, and a logo belongs to the make
        // rather than to either list, so every one of them goes.
        foreach (VehicleType::cases() as $type) {
            Cache::forget('reference:makes:'.$type->value);
        }

        $this->info("Linked {$linked} logos.");

        if ($linked > 0) {
            $this->line('Cleared the cached /makes response, so they show straight away.');
        }

        return self::SUCCESS;
    }

    /**
     * Copy any committed mark that is not on the disk yet.
     *
     * Only what is missing, so a file replaced by hand on the disk is left
     * alone rather than being overwritten on every run.
     *
     * @param  Filesystem  $disk
     */
    private function seedFromResources($disk, string $directory): int
    {
        $source = resource_path('make-logos');

        if (! is_dir($source)) {
            return 0;
        }

        $copied = 0;

        foreach (glob($source.'/*.{png,svg,webp}', GLOB_BRACE) ?: [] as $path) {
            $target = $directory.'/'.basename($path);

            if ($disk->exists($target)) {
                continue;
            }

            $contents = file_get_contents($path);

            if ($contents === false) {
                $this->warn('Could not read '.basename($path).'.');

                continue;
            }

            $disk->put($target, $contents);
            $copied++;
        }

        return $copied;
    }
}
