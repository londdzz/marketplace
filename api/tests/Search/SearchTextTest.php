<?php

declare(strict_types=1);

use App\Models\Listing;
use App\Models\Make;
use App\Models\VehicleModel;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);
});

it('builds the searchable text from the listing when it is saved', function (): void {
    $make = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $model = VehicleModel::query()->where('make_id', $make->id)->where('name', 'Passat')->firstOrFail();

    $listing = Listing::factory()->create([
        'make_id' => $make->id,
        'model_id' => $model->id,
        'variant' => '2.0 TDI Highline',
        'year' => 2016,
        'description' => 'Mirëmbajtur shumë mirë',
    ]);

    expect($listing->search_text)->toContain('volkswagen')
        ->and($listing->search_text)->toContain('pasat')
        ->and($listing->search_text)->toContain('2016')
        ->and($listing->search_text)->toContain('tdi')
        // Albanian diacritics are gone, like everything else in the column.
        ->and($listing->search_text)->toContain('mirembajtur');
});

it('rewrites the searchable text when the listing changes', function (): void {
    $make = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $golf = VehicleModel::query()->where('make_id', $make->id)->where('name', 'Golf')->firstOrFail();
    $passat = VehicleModel::query()->where('make_id', $make->id)->where('name', 'Passat')->firstOrFail();

    $listing = Listing::factory()->create(['make_id' => $make->id, 'model_id' => $golf->id]);

    expect($listing->search_text)->toContain('golf');

    $listing->update(['model_id' => $passat->id]);

    expect($listing->fresh()->search_text)->toContain('pasat')
        ->and($listing->fresh()->search_text)->not->toContain('golf');
});

it('leaves the searchable text alone when nothing searchable changed', function (): void {
    $listing = Listing::factory()->create();
    $before = $listing->search_text;

    $listing->forceFill(['view_count' => 99])->save();

    expect($listing->fresh()->search_text)->toBe($before);
});

it('rebuilds every listing on demand', function (): void {
    $listings = Listing::factory()->count(3)->create();

    Listing::query()->update(['search_text' => 'stale']);

    $this->artisan('listings:reindex')
        ->expectsOutputToContain('Reindexed 3 listings.')
        ->assertSuccessful();

    foreach ($listings as $listing) {
        expect($listing->fresh()->search_text)->not->toBe('stale');
    }
});
