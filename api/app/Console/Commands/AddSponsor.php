<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\SponsorSlot;
use App\Enums\VehicleType;
use App\Models\Sponsor;
use App\Services\SponsorService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Throwable;

/**
 * Book a sponsor onto the home screen.
 *
 * This is the only way one is created. There is no endpoint and no screen: an
 * advertisement anybody could submit is an advertisement nobody is checking,
 * and the specification rules out an admin interface. So a booking is a
 * command run by whoever sold it, with the artwork already on the server.
 *
 * The picture is re-encoded here the way a listing's photographs are: scaled
 * down to something a phone should be asked to download, and stripped of the
 * EXIF a sponsor's designer left in it.
 */
class AddSponsor extends Command
{
    protected $signature = 'sponsors:add
        {name : Who is paying for it, for your own records}
        {image : Path to the artwork on this machine}
        {--slot= : home_top, home_feed or home_partners}
        {--alt= : What the picture says, for a screen reader}
        {--link= : Where tapping goes. Leave out for presence only}
        {--type= : car or motorcycle. Leave out to show beside both}
        {--position=0 : Lowest first within the slot}
        {--from= : Start date, e.g. 2026-10-01}
        {--until= : End date. The booking stops itself}';

    protected $description = 'Put a sponsor on the home screen';

    public function handle(): int
    {
        $slot = SponsorSlot::tryFrom((string) ($this->option('slot') ?: $this->choice(
            'Which slot?',
            SponsorSlot::values(),
            SponsorSlot::Feed->value,
        )));

        if (! $slot instanceof SponsorSlot) {
            $this->error('Unknown slot. One of: '.implode(', ', SponsorSlot::values()));

            return self::FAILURE;
        }

        $source = (string) $this->argument('image');

        if (! is_readable($source)) {
            $this->error("No readable file at {$source}.");

            return self::FAILURE;
        }

        // Asked for rather than defaulted, because a description generated
        // from a filename is worse than none: it reads as if somebody wrote
        // it, and a blind buyer is told "banner-final-v3".
        $alt = (string) ($this->option('alt') ?: $this->ask('What does the picture say? (read out instead of the image)'));

        if (trim($alt) === '') {
            $this->error('The description is not optional — it is what a screen reader reads out.');

            return self::FAILURE;
        }

        $type = null;

        if ($this->option('type')) {
            $type = VehicleType::tryFrom((string) $this->option('type'));

            if (! $type instanceof VehicleType) {
                $this->error('Unknown type. One of: '.implode(', ', VehicleType::values()));

                return self::FAILURE;
            }
        }

        try {
            $path = $this->store($source, $slot);
        } catch (Throwable $e) {
            $this->error('That image could not be read: '.$e->getMessage());

            return self::FAILURE;
        }

        $sponsor = Sponsor::query()->create([
            'name' => (string) $this->argument('name'),
            'slot' => $slot,
            'image_path' => $path,
            'alt' => trim($alt),
            'link_url' => $this->option('link') ?: null,
            'vehicle_type' => $type,
            'position' => (int) $this->option('position'),
            'starts_at' => $this->option('from') ? Carbon::parse((string) $this->option('from')) : null,
            'ends_at' => $this->option('until') ? Carbon::parse((string) $this->option('until'))->endOfDay() : null,
            'active' => true,
        ]);

        SponsorService::forget();

        $this->info("Booked #{$sponsor->id} — {$sponsor->name} in {$slot->value}.");
        $this->line(Storage::disk((string) config('filesystems.default'))->url($path));
        $this->line('The home screen picks it up within half an hour, or at once for anybody opening the app fresh.');

        return self::SUCCESS;
    }

    /**
     * Re-encode onto the storage disk.
     *
     * 1600 across matches what a listing's photographs are held at, which is
     * more than any of these three slots draws even on the densest phone. A
     * sponsor who supplies a 6000-pixel export should not cost every buyer
     * the download.
     */
    private function store(string $source, SponsorSlot $slot): string
    {
        $image = (new ImageManager(new Driver))->read($source);
        $image->orient();
        $image->scaleDown(width: 1600, height: 1600);

        $path = sprintf('sponsors/%s/%s.jpg', $slot->value, Str::uuid());

        Storage::disk((string) config('filesystems.default'))
            ->put($path, (string) $image->toJpeg(86));

        return $path;
    }
}
