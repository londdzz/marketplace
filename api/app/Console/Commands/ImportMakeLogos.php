<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Make;
use App\Support\TextNormalizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * Links logo files already on the storage disk to the makes they belong to.
 *
 * Drop files named after the make into makes/ on the configured disk, for
 * example makes/volkswagen.png or makes/mercedes-benz.svg, then run this. The
 * match is on the normalized name, so "Škoda" finds skoda.png.
 */
class ImportMakeLogos extends Command
{
    protected $signature = 'makes:logos {--directory=makes}';

    protected $description = 'Attach logo files on the storage disk to their makes';

    public function handle(): int
    {
        $disk = Storage::disk((string) config('filesystems.default'));
        $directory = (string) $this->option('directory');

        $files = $disk->files($directory);

        if ($files === []) {
            $this->warn("No files found in [{$directory}] on the ".config('filesystems.default').' disk.');

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
        Cache::forget('reference:makes');

        $this->info("Linked {$linked} logos.");

        if ($linked > 0) {
            $this->line('Cleared the cached /makes response, so they show straight away.');
        }

        return self::SUCCESS;
    }
}
