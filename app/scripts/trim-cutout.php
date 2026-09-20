<?php

declare(strict_types=1);

/**
 * Trim a cut-out car to its own edges and size it for a tile.
 *
 * A cut-out arrives with whatever empty margin its canvas had, and a row of
 * them drawn at different scales reads as a row of mistakes. This crops each
 * one to the car itself, so every tile scales the same thing, and prints the
 * height over width — which the app needs where a cut-out shares a box with
 * anything else, since a low saloon drawn at an SUV's proportions is squashed.
 *
 *   php scripts/trim-cutout.php <source.png> <destination.png> [width]
 */

[$script, $source, $destination] = array_pad($argv, 3, null);
$width = (int) ($argv[3] ?? 420);

if ($source === null || $destination === null) {
    fwrite(STDERR, "usage: php {$script} <source.png> <destination.png> [width]\n");
    exit(1);
}

$image = @imagecreatefrompng($source);

if ($image === false) {
    fwrite(STDERR, "cannot read {$source}\n");
    exit(1);
}

imagealphablending($image, false);
imagesavealpha($image, true);

$sourceWidth = imagesx($image);
$sourceHeight = imagesy($image);

// Anything more than half opaque counts as part of the car; a soft shadow
// under it does not, or every car would be trimmed to its canvas.
$left = $sourceWidth;
$right = 0;
$top = $sourceHeight;
$bottom = 0;

for ($x = 0; $x < $sourceWidth; $x++) {
    for ($y = 0; $y < $sourceHeight; $y++) {
        if (((imagecolorat($image, $x, $y) >> 24) & 0x7F) < 100) {
            $left = min($left, $x);
            $right = max($right, $x);
            $top = min($top, $y);
            $bottom = max($bottom, $y);
        }
    }
}

if ($right <= $left || $bottom <= $top) {
    fwrite(STDERR, "{$source} is empty once its transparent margin is removed\n");
    exit(1);
}

$cropWidth = $right - $left + 1;
$cropHeight = $bottom - $top + 1;
$height = (int) round($cropHeight * $width / $cropWidth);

$out = imagecreatetruecolor($width, $height);
imagealphablending($out, false);
imagesavealpha($out, true);
imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
imagecopyresampled($out, $image, 0, 0, $left, $top, $width, $height, $cropWidth, $cropHeight);

if (! is_dir(dirname($destination))) {
    mkdir(dirname($destination), 0o755, true);
}

imagepng($out, $destination, 9);

printf(
    "%s  %dx%d -> %dx%d  ratio %.3f  %d KB\n",
    basename($destination),
    $sourceWidth,
    $sourceHeight,
    $width,
    $height,
    $height / $width,
    (int) round(filesize($destination) / 1024),
);
