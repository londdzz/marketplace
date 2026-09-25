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
 * The marks live in resources/make-logos and are committed, with the licence
 * and author of each one in CREDITS.json beside them. So a fresh checkout
 * needs this one command and no Node: that directory is mirrored onto the
 * disk first — new files copied, changed ones replaced, withdrawn ones taken
 * down — and then everything in makes/ is matched to a make by its normalised
 * name, so "Škoda" finds skoda.png.
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

        [$copied, $removed] = $this->seedFromResources($disk, $directory);

        if ($copied > 0) {
            $this->line("Copied {$copied} marks onto the ".config('filesystems.default').' disk.');
        }

        if ($removed > 0) {
            $this->line("Removed {$removed} mark(s) the repository no longer ships.");
        }

        $files = $this->images($disk, $directory);

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

        // A make whose file has just been taken down still has its path in the
        // column, and MakeResource would go on handing out a URL for a file
        // that 404s.
        $orphaned = Make::query()
            ->whereNotNull('logo_path')
            ->whereNotIn('logo_path', $files)
            ->update(['logo_path' => null]);

        if ($orphaned > 0) {
            $this->line("Cleared {$orphaned} make(s) whose mark is no longer on the disk.");
        }

        $this->info("Linked {$linked} logos.");

        if ($linked > 0) {
            $this->line('Cleared the cached /makes response, so they show straight away.');
        }

        return self::SUCCESS;
    }

    /**
     * Put the committed marks on the disk, and take down the ones we have
     * stopped shipping.
     *
     * A mark that is already there is compared rather than skipped. The marks
     * are redrawn from time to time — the backgrounds came off them all at
     * once — and a copy that only ever filled in the gaps would have left
     * every server that had already run it serving the old ones for good,
     * with a deploy reporting success either way.
     *
     * Anything in the directory that the repository no longer carries goes:
     * four makes turned out to have a photograph of a badge rather than a
     * mark, and leaving the file behind means the make keeps drawing it.
     *
     * @param  Filesystem  $disk
     * @return array{0: int, 1: int}
     */
    private function seedFromResources($disk, string $directory): array
    {
        $source = resource_path('make-logos');

        if (! is_dir($source)) {
            return [0, 0];
        }

        $copied = 0;
        $shipped = [];

        foreach (glob($source.'/*.{png,svg,webp}', GLOB_BRACE) ?: [] as $path) {
            $target = $directory.'/'.basename($path);
            $shipped[] = $target;

            $contents = file_get_contents($path);

            if ($contents === false) {
                $this->warn('Could not read '.basename($path).'.');

                continue;
            }

            // Compare before writing: on S3 a put is a billed request and a
            // new version of an object a CDN is already caching.
            if ($disk->exists($target) && $disk->get($target) === $contents) {
                continue;
            }

            $disk->put($target, $contents);
            $copied++;
        }

        $stale = array_diff($this->images($disk, $directory), $shipped);

        foreach ($stale as $file) {
            $disk->delete($file);
        }

        return [$copied, count($stale)];
    }

    /**
     * The image files in a directory on the disk.
     *
     * CREDITS.json sits beside them, naming the licence and the author of
     * every mark, and it is not one.
     *
     * @param  Filesystem  $disk
     * @return list<string>
     */
    private function images($disk, string $directory): array
    {
        return array_values(array_filter(
            $disk->files($directory),
            fn (string $file): bool => in_array(
                strtolower(pathinfo($file, PATHINFO_EXTENSION)),
                ['png', 'jpg', 'jpeg', 'webp'],
                true,
            ),
        ));
    }
}
