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
            [$path, $width, $height] = $this->store($source, $slot);
        } catch (Throwable $e) {
            $this->error('That image could not be read: '.$e->getMessage());

            return self::FAILURE;
        }

        $sponsor = Sponsor::query()->create([
            'name' => (string) $this->argument('name'),
            'slot' => $slot,
            'image_path' => $path,
            'alt' => trim($alt),
            'width' => $width,
            'height' => $height,
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
     *
     * **A transparent source stays a PNG.** Everything went to JPEG at first,
     * and JPEG has no alpha channel: a partner's logo — which is exactly the
     * kind of file that arrives as a transparent PNG — came out as a white
     * rectangle, and a white logo on it vanished entirely. A banner is a
     * photograph and belongs in JPEG; a mark is line art on nothing and
     * belongs in PNG, so the source decides rather than the slot.
     */
    /** @return array{0: string, 1: int, 2: int} */
    private function store(string $source, SponsorSlot $slot): array
    {
        $transparent = $this->hasAlpha($source);

        $image = (new ImageManager(new Driver))->read($source);
        $image->orient();

        // A logo is trimmed to its own edges, the way the body-shape cut-outs
        // are. Designers export marks onto whatever canvas the brand guide
        // uses, and a file that is two thirds empty draws a third the size of
        // the one beside it — a row of partners then looks like a mistake
        // rather than a row. A banner is left alone: its margins are part of
        // the composition, and trimming a photograph crops the photograph.
        //
        // Intervention's own trim() is no use here: it compares colour and
        // ignores the alpha channel, so a mark on a transparent canvas came
        // back exactly the size it went in. This measures the alpha instead.
        if ($slot === SponsorSlot::Partners && $transparent) {
            $bounds = $this->inkBounds($source);

            if ($bounds !== null) {
                [$x, $y, $width, $height] = $bounds;
                $image->crop($width, $height, $x, $y);
            }
        }

        $image->scaleDown(width: 1600, height: 1600);

        $path = sprintf(
            'sponsors/%s/%s.%s',
            $slot->value,
            Str::uuid(),
            $transparent ? 'png' : 'jpg',
        );

        Storage::disk((string) config('filesystems.default'))->put(
            $path,
            $transparent ? (string) $image->toPng() : (string) $image->toJpeg(86),
        );

        // Measured after everything that could change it, so what is stored
        // is what the apps will actually be laying out.
        return [$path, $image->width(), $image->height()];
    }

    /**
     * The box the mark actually occupies, ignoring transparent margin.
     *
     * Returns [x, y, width, height], or null when the file is empty or has no
     * margin worth taking off. Read at full resolution rather than sampled:
     * this decides a crop, and a sampled edge would cut into the mark.
     *
     * @return array{0: int, 1: int, 2: int, 3: int}|null
     */
    private function inkBounds(string $path): ?array
    {
        $image = @imagecreatefrompng($path);

        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $minX = $width;
        $maxX = -1;
        $minY = $height;
        $maxY = -1;

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                // Anything at all opaque counts as ink, so an antialiased
                // edge is kept rather than shaved.
                if (((imagecolorat($image, $x, $y) >> 24) & 0x7F) > 100) {
                    continue;
                }

                if ($x < $minX) {
                    $minX = $x;
                }
                if ($x > $maxX) {
                    $maxX = $x;
                }
                if ($y < $minY) {
                    $minY = $y;
                }
                if ($y > $maxY) {
                    $maxY = $y;
                }
            }
        }

        imagedestroy($image);

        if ($maxX < $minX || $maxY < $minY) {
            return null;
        }

        return [$minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1];
    }

    /**
     * Whether the file actually uses transparency.
     *
     * Not "is it a PNG": most PNGs a sponsor sends are opaque exports, and
     * storing those as PNG would triple what every buyer downloads for no
     * gain. So the pixels are asked rather than the extension.
     *
     * Sampled on a grid rather than read in full. A 1600-pixel image is two
     * and a half million pixels, a logo's transparency is nearly all of its
     * area, and a few thousand samples find it without the wait.
     */
    private function hasAlpha(string $path): bool
    {
        $info = @getimagesize($path);

        // JPEG cannot carry alpha at all, so there is nothing to look for.
        if ($info === false || ! in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)) {
            return false;
        }

        $image = match ($info[2]) {
            IMAGETYPE_PNG => @imagecreatefrompng($path),
            IMAGETYPE_WEBP => @imagecreatefromwebp($path),
            default => @imagecreatefromgif($path),
        };

        if ($image === false) {
            return false;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $step = max(1, (int) floor(min($width, $height) / 64));

        for ($y = 0; $y < $height; $y += $step) {
            for ($x = 0; $x < $width; $x += $step) {
                // GD's alpha runs 0 (opaque) to 127 (invisible).
                if (((imagecolorat($image, $x, $y) >> 24) & 0x7F) > 8) {
                    imagedestroy($image);

                    return true;
                }
            }
        }

        imagedestroy($image);

        return false;
    }
}
