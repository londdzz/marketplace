<?php

declare(strict_types=1);

use App\Models\Listing;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->seller = User::factory()->create(['country_code' => 'XK']);
    $this->stranger = User::factory()->create(['country_code' => 'XK']);
    $this->listing = Listing::factory()->create(['user_id' => $this->seller->id]);
});

it('will not let another seller edit my listing', function (): void {
    $this->actingAs($this->stranger, 'sanctum')
        ->patchJson("/api/v1/listings/{$this->listing->id}", ['description' => 'Mine now'])
        ->assertStatus(403);

    expect($this->listing->fresh()->description)->not->toBe('Mine now');
});

it('will not let another seller delete my listing', function (): void {
    $this->actingAs($this->stranger, 'sanctum')
        ->deleteJson("/api/v1/listings/{$this->listing->id}")
        ->assertStatus(403);

    expect(Listing::query()->whereKey($this->listing->id)->exists())->toBeTrue();
});

it('will not let another seller add photos to my listing', function (): void {
    Storage::fake('local');

    $this->actingAs($this->stranger, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/photos", [
            'photos' => [UploadedFile::fake()->image('car.jpg', 1200, 800)],
        ])
        ->assertStatus(403);

    expect($this->listing->photos()->count())->toBe(0);
});

it('will not let another seller reorder or remove my photos', function (): void {
    Storage::fake('local');

    $photos = $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/photos", [
            'photos' => [
                UploadedFile::fake()->image('one.jpg', 1200, 800),
                UploadedFile::fake()->image('two.jpg', 1200, 800),
            ],
        ])
        ->assertStatus(201)
        ->json('data');

    $ids = array_column($photos, 'id');

    $this->actingAs($this->stranger, 'sanctum')
        ->patchJson("/api/v1/listings/{$this->listing->id}/photos/order", ['photo_ids' => array_reverse($ids)])
        ->assertStatus(403);

    $this->actingAs($this->stranger, 'sanctum')
        ->deleteJson("/api/v1/listings/{$this->listing->id}/photos/{$ids[0]}")
        ->assertStatus(403);

    expect($this->listing->photos()->count())->toBe(2);
});

it('will not let another seller see my draft', function (): void {
    $this->actingAs($this->stranger, 'sanctum')
        ->getJson("/api/v1/listings/{$this->listing->id}")
        ->assertStatus(403);
});

it('keeps one seller list out of another seller list', function (): void {
    Listing::factory()->count(3)->create(['user_id' => $this->stranger->id]);

    $this->actingAs($this->seller, 'sanctum')
        ->getJson('/api/v1/my/listings')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->listing->id);
});

it('needs a token for anything that changes a listing', function (string $method, string $path): void {
    $path = str_replace('{id}', $this->listing->id, $path);

    $this->json($method, $path)->assertStatus(401);
})->with([
    ['post', '/api/v1/listings'],
    ['patch', '/api/v1/listings/{id}'],
    ['delete', '/api/v1/listings/{id}'],
    ['post', '/api/v1/listings/{id}/photos'],
    ['patch', '/api/v1/listings/{id}/photos/order'],
    ['get', '/api/v1/my/listings'],
]);

it('shuts a blocked seller out of creating listings', function (): void {
    $blocked = User::factory()->blocked()->create(['country_code' => 'XK']);

    $this->actingAs($blocked, 'sanctum')
        ->postJson('/api/v1/listings', [])
        ->assertStatus(403);
});

it('will not remove a photo through a listing that does not own it', function (): void {
    Storage::fake('local');

    $otherListing = Listing::factory()->create(['user_id' => $this->seller->id]);

    $photoId = $this->actingAs($this->seller, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/photos", [
            'photos' => [UploadedFile::fake()->image('one.jpg', 800, 600)],
        ])
        ->json('data.0.id');

    $this->actingAs($this->seller, 'sanctum')
        ->deleteJson("/api/v1/listings/{$otherListing->id}/photos/{$photoId}")
        ->assertStatus(404);

    expect($this->listing->photos()->count())->toBe(1);
});
