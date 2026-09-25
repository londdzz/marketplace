<?php

declare(strict_types=1);

use App\Enums\VehicleType;
use App\Models\Listing;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;
use Illuminate\Support\Facades\Cache;

/**
 * The seeder only adds and updates, which is what makes it safe on every
 * deploy and what left BMW's "Series 3" sitting beside its "3 Series" when the
 * data was rewritten. Two spellings of the same car in one picker is a seller
 * choosing wrong half the time.
 */
beforeEach(function (): void {
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $this->bmw = Make::query()->where('name', 'BMW')->firstOrFail();
});

it('removes a model the data no longer names', function (): void {
    $stale = VehicleModel::query()->create([
        'make_id' => $this->bmw->getKey(),
        'vehicle_type' => VehicleType::Car,
        'name' => 'Series 3',
        'body_type' => 'sedan',
    ]);

    $this->artisan('models:prune')->assertSuccessful();

    expect(VehicleModel::query()->whereKey($stale->getKey())->exists())->toBeFalse()
        // The row it was a second spelling of is untouched.
        ->and(VehicleModel::query()
            ->where('make_id', $this->bmw->getKey())
            ->where('name', '3 Series')
            ->exists())->toBeTrue();
});

it('leaves everything the data still names alone', function (): void {
    $before = VehicleModel::query()->count();

    $this->artisan('models:prune')->assertSuccessful();

    expect(VehicleModel::query()->count())->toBe($before);
});

it('never removes a model a listing names', function (): void {
    $stale = VehicleModel::query()->create([
        'make_id' => $this->bmw->getKey(),
        'vehicle_type' => VehicleType::Car,
        'name' => 'Series 3',
        'body_type' => 'sedan',
    ]);

    Listing::factory()->create([
        'user_id' => User::factory(),
        'make_id' => $this->bmw->getKey(),
        'model_id' => $stale->getKey(),
    ]);

    // A listing names a real car somebody is selling, and this row is what
    // gives it that name. The rename is a person's decision from here.
    $this->artisan('models:prune')
        ->expectsOutputToContain('1 listing(s) still name it.')
        ->assertSuccessful();

    expect(VehicleModel::query()->whereKey($stale->getKey())->exists())->toBeTrue();
});

it('lists what would go without touching it', function (): void {
    $stale = VehicleModel::query()->create([
        'make_id' => $this->bmw->getKey(),
        'vehicle_type' => VehicleType::Car,
        'name' => 'Series 3',
        'body_type' => 'sedan',
    ]);

    $this->artisan('models:prune', ['--dry-run' => true])
        ->expectsOutputToContain('Would remove BMW Series 3')
        ->assertSuccessful();

    expect(VehicleModel::query()->whereKey($stale->getKey())->exists())->toBeTrue();
});

it('clears the cached model list, so the picker stops offering what went', function (): void {
    VehicleModel::query()->create([
        'make_id' => $this->bmw->getKey(),
        'vehicle_type' => VehicleType::Car,
        'name' => 'Series 3',
        'body_type' => 'sedan',
    ]);

    // Warm it the way a request would, and prove it is warm.
    $names = array_column($this->getJson("/api/v1/makes/{$this->bmw->id}/models")->json('data'), 'name');
    expect($names)->toContain('Series 3')
        ->and(Cache::has("reference:models:{$this->bmw->id}:car"))->toBeTrue();

    $this->artisan('models:prune')->assertSuccessful();

    expect(Cache::has("reference:models:{$this->bmw->id}:car"))->toBeFalse()
        ->and(array_column($this->getJson("/api/v1/makes/{$this->bmw->id}/models")->json('data'), 'name'))
        ->not->toContain('Series 3');
});
