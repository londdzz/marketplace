<?php

declare(strict_types=1);

use App\Enums\SponsorSlot;
use App\Models\Sponsor;
use Illuminate\Support\Facades\Storage;

/** A mark on a transparent canvas, with margin around it — what a designer sends. */
function transparentLogo(string $path, int $width = 400, int $height = 200): void
{
    $image = imagecreatetruecolor($width, $height);
    imagesavealpha($image, true);
    imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
    imagefilledrectangle($image, 100, 90, 300, 110, imagecolorallocate($image, 255, 255, 255));
    imagepng($image, $path);
    imagedestroy($image);
}

/** An opaque photograph, which is what a banner is. */
function opaqueBanner(string $path): void
{
    $image = imagecreatetruecolor(1200, 400);
    imagefill($image, 0, 0, imagecolorallocate($image, 20, 80, 140));
    imagejpeg($image, $path, 90);
    imagedestroy($image);
}

beforeEach(function (): void {
    Storage::fake('public');
    config()->set('filesystems.default', 'public');
    $this->workspace = sys_get_temp_dir().'/sponsor-'.uniqid();
    mkdir($this->workspace);
});

afterEach(function (): void {
    array_map('unlink', glob($this->workspace.'/*') ?: []);
    rmdir($this->workspace);
});

it('keeps a transparent logo as a PNG', function (): void {
    $source = $this->workspace.'/logo.png';
    transparentLogo($source);

    $this->artisan('sponsors:add', [
        'name' => 'Gumi Skopje',
        'image' => $source,
        '--slot' => SponsorSlot::Partners->value,
        '--alt' => 'Gumi Skopje',
    ])->assertSuccessful();

    // JPEG has no alpha channel. Storing a mark as one turns its transparent
    // canvas white, and a white logo on it disappears completely.
    expect(Sponsor::query()->first()->image_path)->toEndWith('.png');
});

it('trims a logo to its own edges', function (): void {
    $source = $this->workspace.'/logo.png';
    transparentLogo($source);

    $this->artisan('sponsors:add', [
        'name' => 'Gumi Skopje',
        'image' => $source,
        '--slot' => SponsorSlot::Partners->value,
        '--alt' => 'Gumi Skopje',
    ])->assertSuccessful();

    $sponsor = Sponsor::query()->first();

    // 400x200 in, with the mark occupying 201x21 of it. Untrimmed, a file
    // that is mostly empty draws a fraction of the size of the one beside it
    // and the row looks like a mistake.
    expect($sponsor->width)->toBe(201)
        ->and($sponsor->height)->toBe(21);
});

it('leaves a banner as a JPEG, and does not trim it', function (): void {
    $source = $this->workspace.'/banner.jpg';
    opaqueBanner($source);

    $this->artisan('sponsors:add', [
        'name' => 'Banka',
        'image' => $source,
        '--slot' => SponsorSlot::Top->value,
        '--alt' => 'Banka: car loans',
    ])->assertSuccessful();

    $sponsor = Sponsor::query()->first();

    // A banner's margins are part of its composition, and trimming a
    // photograph crops the photograph.
    expect($sponsor->image_path)->toEndWith('.jpg')
        ->and($sponsor->width)->toBe(1200)
        ->and($sponsor->height)->toBe(400);
});

it('refuses a booking with no description', function (): void {
    $source = $this->workspace.'/logo.png';
    transparentLogo($source);

    $this->artisan('sponsors:add', [
        'name' => 'Nameless',
        'image' => $source,
        '--slot' => SponsorSlot::Partners->value,
        '--alt' => '   ',
    ])->assertFailed();

    expect(Sponsor::query()->count())->toBe(0);
});

it('refuses a file that is not there', function (): void {
    $this->artisan('sponsors:add', [
        'name' => 'Missing',
        'image' => $this->workspace.'/nothing.png',
        '--slot' => SponsorSlot::Partners->value,
        '--alt' => 'Missing',
    ])->assertFailed();
});
