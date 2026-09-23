<?php

declare(strict_types=1);

use App\Models\Make;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * /makes is cached for an hour. Linking logos without clearing it reports
 * success while every make keeps drawing its monogram, which reads as the
 * command having done nothing.
 */
it('clears the cached makes response so new logos show at once', function (): void {
    Storage::fake(config('filesystems.default'));
    Make::query()->create(['name' => 'Audi', 'name_normalized' => 'audi']);
    Storage::put('makes/audi.png', 'not really a png');

    // Warm the cache the way a request would, and prove it is warm.
    $this->getJson('/api/v1/makes')->assertOk()->assertJsonPath('data.0.logo_url', null);
    expect(Cache::has('reference:makes'))->toBeTrue();

    $this->artisan('makes:logos')->assertSuccessful();

    expect(Cache::has('reference:makes'))->toBeFalse();
    $this->getJson('/api/v1/makes')->assertOk()->assertJsonPath('data.0.name', 'Audi');
    expect($this->getJson('/api/v1/makes')->json('data.0.logo_url'))->not->toBeNull();
});
