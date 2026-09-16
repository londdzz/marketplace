<?php

declare(strict_types=1);

use App\Models\Listing;
use App\Models\ListingPhoto;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    Storage::fake(config('filesystems.default'));

    $this->seller = User::factory()->create(['country_code' => 'XK']);
    $this->listing = Listing::factory()->create(['user_id' => $this->seller->id]);
});

/**
 * @param  array<int, UploadedFile>  $files
 */
function upload(array $files): TestResponse
{
    return test()->actingAs(test()->seller, 'sanctum')
        ->postJson('/api/v1/listings/'.test()->listing->id.'/photos', ['photos' => $files]);
}

/**
 * Read the pixel size of a file on the fake disk.
 *
 * @return array{0: int, 1: int}
 */
function imageSize(string $path): array
{
    $info = getimagesizefromstring(Storage::disk(config('filesystems.default'))->get($path));

    return [(int) $info[0], (int) $info[1]];
}

it('resizes to a 1600px long edge and writes a 400px thumbnail', function (): void {
    upload([UploadedFile::fake()->image('wide.jpg', 3000, 2000)])->assertStatus(201);

    $photo = ListingPhoto::query()->sole();

    Storage::disk(config('filesystems.default'))->assertExists($photo->path);
    Storage::disk(config('filesystems.default'))->assertExists($photo->thumb_path);

    expect(imageSize($photo->path))->toBe([1600, 1067])
        ->and(imageSize($photo->thumb_path))->toBe([400, 267])
        ->and($photo->width)->toBe(1600)
        ->and($photo->height)->toBe(1067);
});

it('caps the long edge whichever way round the photo is', function (): void {
    upload([UploadedFile::fake()->image('tall.jpg', 2000, 3000)])->assertStatus(201);

    expect(imageSize(ListingPhoto::query()->sole()->path))->toBe([1067, 1600]);
});

it('leaves a photo smaller than the cap alone', function (): void {
    upload([UploadedFile::fake()->image('small.jpg', 800, 600)])->assertStatus(201);

    expect(imageSize(ListingPhoto::query()->sole()->path))->toBe([800, 600]);
});

it('accepts a single photo as well as a batch', function (): void {
    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/photos", [
            'photo' => UploadedFile::fake()->image('one.jpg', 900, 600),
        ])
        ->assertStatus(201)
        ->assertJsonCount(1, 'data');

    expect(ListingPhoto::query()->count())->toBe(1);
});

it('numbers photos in the order they arrive and keeps appending', function (): void {
    upload([
        UploadedFile::fake()->image('one.jpg', 900, 600),
        UploadedFile::fake()->image('two.jpg', 900, 600),
    ])->assertStatus(201);

    upload([UploadedFile::fake()->image('three.jpg', 900, 600)])->assertStatus(201);

    expect($this->listing->photos()->orderBy('position')->pluck('position')->all())
        ->toBe([0, 1, 2]);
});

it('refuses more than fifteen photos on one listing', function (): void {
    $files = [];

    foreach (range(1, 15) as $index) {
        $files[] = UploadedFile::fake()->image("photo-{$index}.jpg", 600, 400);
    }

    upload($files)->assertStatus(201);

    upload([UploadedFile::fake()->image('sixteenth.jpg', 600, 400)])
        ->assertStatus(422)
        ->assertJsonPath('message', trans('listing.photos.too_many', ['max' => 15], app()->getLocale()));

    expect(ListingPhoto::query()->count())->toBe(15);
});

it('refuses a batch that would cross the cap even though each fits', function (): void {
    $files = [];

    foreach (range(1, 10) as $index) {
        $files[] = UploadedFile::fake()->image("photo-{$index}.jpg", 600, 400);
    }

    upload($files)->assertStatus(201);

    $more = [];

    foreach (range(1, 6) as $index) {
        $more[] = UploadedFile::fake()->image("more-{$index}.jpg", 600, 400);
    }

    upload($more)->assertStatus(422);

    expect(ListingPhoto::query()->count())->toBe(10);
});

it('refuses a file that is not an image', function (): void {
    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/photos", [
            'photos' => [UploadedFile::fake()->create('handbook.pdf', 100, 'application/pdf')],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('photos.0');

    expect(ListingPhoto::query()->count())->toBe(0);
});

it('refuses a file that is too large', function (): void {
    $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/photos", [
            'photos' => [UploadedFile::fake()->create('huge.jpg', 20000, 'image/jpeg')],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('photos.0');
});

it('removes a photo and its files, closing the gap in the order', function (): void {
    $ids = array_column(upload([
        UploadedFile::fake()->image('one.jpg', 900, 600),
        UploadedFile::fake()->image('two.jpg', 900, 600),
        UploadedFile::fake()->image('three.jpg', 900, 600),
    ])->json('data'), 'id');

    $middle = ListingPhoto::query()->findOrFail($ids[1]);

    $this->actingAs($this->seller, 'sanctum')
        ->deleteJson("/api/v1/listings/{$this->listing->id}/photos/{$ids[1]}")
        ->assertNoContent();

    Storage::disk(config('filesystems.default'))->assertMissing($middle->path);
    Storage::disk(config('filesystems.default'))->assertMissing($middle->thumb_path);

    expect($this->listing->photos()->orderBy('position')->pluck('id')->all())
        ->toBe([$ids[0], $ids[2]])
        ->and($this->listing->photos()->orderBy('position')->pluck('position')->all())
        ->toBe([0, 1]);
});

it('puts the photos in the order the seller chose', function (): void {
    $ids = array_column(upload([
        UploadedFile::fake()->image('one.jpg', 900, 600),
        UploadedFile::fake()->image('two.jpg', 900, 600),
        UploadedFile::fake()->image('three.jpg', 900, 600),
    ])->json('data'), 'id');

    $newOrder = [$ids[2], $ids[0], $ids[1]];

    $this->actingAs($this->seller, 'sanctum')
        ->patchJson("/api/v1/listings/{$this->listing->id}/photos/order", ['photo_ids' => $newOrder])
        ->assertOk()
        ->assertJsonPath('data.0.id', $ids[2])
        ->assertJsonPath('data.1.id', $ids[0])
        ->assertJsonPath('data.2.id', $ids[1]);

    expect($this->listing->photos()->orderBy('position')->pluck('id')->all())->toBe($newOrder);
});

it('refuses an order that leaves a photo out', function (): void {
    $ids = array_column(upload([
        UploadedFile::fake()->image('one.jpg', 900, 600),
        UploadedFile::fake()->image('two.jpg', 900, 600),
    ])->json('data'), 'id');

    $this->actingAs($this->seller, 'sanctum')
        ->patchJson("/api/v1/listings/{$this->listing->id}/photos/order", ['photo_ids' => [$ids[0]]])
        ->assertStatus(422)
        ->assertJsonValidationErrors('photo_ids');
});

it('refuses an order naming a photo from another listing', function (): void {
    $mine = array_column(upload([UploadedFile::fake()->image('one.jpg', 900, 600)])->json('data'), 'id');

    $other = Listing::factory()->create(['user_id' => $this->seller->id]);
    $theirs = $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$other->id}/photos", [
            'photos' => [UploadedFile::fake()->image('theirs.jpg', 900, 600)],
        ])
        ->json('data.0.id');

    $this->actingAs($this->seller, 'sanctum')
        ->patchJson("/api/v1/listings/{$this->listing->id}/photos/order", [
            'photo_ids' => [$mine[0], $theirs],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('photo_ids');
});

it('strips camera metadata by re-encoding every upload', function (): void {
    upload([UploadedFile::fake()->image('one.jpg', 1200, 800)])->assertStatus(201);

    $contents = Storage::disk(config('filesystems.default'))->get(ListingPhoto::query()->sole()->path);

    expect($contents)->not->toContain('Exif')
        ->and($contents)->not->toContain('GPS');
});

it('returns a url for the photo and its thumbnail', function (): void {
    upload([UploadedFile::fake()->image('one.jpg', 1200, 800)])
        ->assertStatus(201)
        ->assertJsonStructure(['data' => [['id', 'url', 'thumb_url', 'position', 'width', 'height']]]);
});
