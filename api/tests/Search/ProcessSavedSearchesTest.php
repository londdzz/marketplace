<?php

declare(strict_types=1);

use App\Contracts\PushSender;
use App\Enums\FuelType;
use App\Enums\Platform;
use App\Models\City;
use App\Models\DeviceToken;
use App\Models\Listing;
use App\Models\Make;
use App\Models\SavedSearch;
use App\Models\User;
use App\Models\VehicleModel;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;
use Database\Seeders\VehicleModelSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Testing\PendingCommand;
use Tests\Support\RecordingPushSender;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);
    $this->seed(MakeSeeder::class);
    $this->seed(VehicleModelSeeder::class);

    $this->sender = new RecordingPushSender;
    $this->app->instance(PushSender::class, $this->sender);

    $this->buyer = User::factory()->create(['country_code' => 'MK', 'preferred_language' => 'mk']);

    DeviceToken::query()->create([
        'user_id' => $this->buyer->id,
        'token' => 'buyer-phone',
        'platform' => Platform::Ios,
    ]);

    $this->vw = Make::query()->where('name', 'Volkswagen')->firstOrFail();
    $this->passat = VehicleModel::query()->where('make_id', $this->vw->id)->where('name', 'Passat')->firstOrFail();
    $this->golf = VehicleModel::query()->where('make_id', $this->vw->id)->where('name', 'Golf')->firstOrFail();
    $this->city = City::query()->where('country_code', 'MK')->firstOrFail();
});

/**
 * @param  array<string, mixed>  $attributes
 */
function publishedListing(array $attributes = []): Listing
{
    return Listing::factory()->active()->create(array_merge([
        'make_id' => test()->vw->id,
        'model_id' => test()->passat->id,
        'fuel' => FuelType::Diesel,
        'price_eur' => '7500.00',
        'country_code' => 'MK',
        'city_id' => test()->city->id,
        'published_at' => Carbon::now(),
    ], $attributes));
}

/**
 * @param  array<string, mixed>  $filters
 */
function savedSearch(array $filters, ?Carbon $lastNotified = null): SavedSearch
{
    $search = SavedSearch::query()->create([
        'user_id' => test()->buyer->id,
        'name' => 'Diesel Passat',
        'filters' => $filters,
        'notify' => true,
    ]);

    $search->forceFill([
        'created_at' => Carbon::now()->subWeek(),
        'last_notified_at' => $lastNotified,
    ])->save();

    return $search;
}

/**
 * Run the job, a minute after whatever the test just published.
 *
 * The window the job reads is half-open, [last run, now), so a listing is only
 * ever picked up by a run that happens after it was published. Tests freeze
 * time, so without this they would publish and run in the same instant, which
 * never happens in production.
 */
function processSavedSearches(): PendingCommand
{
    Carbon::setTestNow(Carbon::now()->addMinute());

    return test()->artisan('saved-searches:process');
}

it('tells a buyer when something new matches their saved search', function (): void {
    $search = savedSearch(['q' => 'passat'], Carbon::now()->subHour());
    publishedListing();

    processSavedSearches()
        ->expectsOutputToContain('Notified 1 saved searches.')
        ->assertSuccessful();

    $sent = $this->sender->last();

    expect($this->sender->count())->toBe(1)
        ->and($sent['user_id'])->toBe($this->buyer->id)
        ->and($sent['title'])->toBe(trans('push.saved_search.title', [], 'mk'))
        ->and($sent['body'])->toContain('Diesel Passat')
        ->and($sent['data'])->toBe(['type' => 'saved_search', 'saved_search_id' => $search->id]);
});

it('says nothing when nothing matches', function (): void {
    savedSearch(['q' => 'lamborghini'], Carbon::now()->subHour());
    publishedListing();

    processSavedSearches()
        ->expectsOutputToContain('Notified 0 saved searches.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(0);
});

it('never tells a buyer about the same car twice', function (): void {
    savedSearch(['q' => 'passat'], Carbon::now()->subHour());
    publishedListing();

    processSavedSearches()->assertSuccessful();
    processSavedSearches()->assertSuccessful();

    expect($this->sender->count())->toBe(1);
});

it('tells a buyer again when another car arrives', function (): void {
    savedSearch(['q' => 'passat'], Carbon::now()->subHour());
    publishedListing();

    processSavedSearches()->assertSuccessful();

    Carbon::setTestNow(Carbon::now()->addMinutes(20));
    publishedListing();

    processSavedSearches()->assertSuccessful();

    expect($this->sender->count())->toBe(2);

    Carbon::setTestNow();
});

it('moves its marker even when nothing matched', function (): void {
    $search = savedSearch(['q' => 'lamborghini'], null);

    processSavedSearches()->assertSuccessful();

    expect($search->fresh()->last_notified_at)->not->toBeNull();
});

it('only looks at listings published since it last ran', function (): void {
    publishedListing(['published_at' => Carbon::now()->subDays(3)]);

    savedSearch(['q' => 'passat'], Carbon::now()->subHour());

    processSavedSearches()
        ->expectsOutputToContain('Notified 0 saved searches.')
        ->assertSuccessful();
});

it('honours the filters the buyer saved', function (): void {
    savedSearch(['model_id' => $this->golf->id], Carbon::now()->subHour());

    publishedListing();

    processSavedSearches()
        ->expectsOutputToContain('Notified 0 saved searches.')
        ->assertSuccessful();

    Carbon::setTestNow(Carbon::now()->addMinute());
    publishedListing(['model_id' => $this->golf->id]);

    processSavedSearches()
        ->expectsOutputToContain('Notified 1 saved searches.')
        ->assertSuccessful();

    Carbon::setTestNow();
});

it('loses nothing published in the same second as its own marker', function (): void {
    $search = savedSearch(['q' => 'passat'], Carbon::now()->subHour());

    // This run stops at exactly now, and the next one starts at exactly now.
    processSavedSearches()->assertSuccessful();

    $marker = $search->fresh()->last_notified_at;

    // Published in the very second the marker records, which a strictly
    // greater-than comparison would skip over for good.
    publishedListing(['published_at' => $marker]);

    processSavedSearches()
        ->expectsOutputToContain('Notified 1 saved searches.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(1);

    Carbon::setTestNow();
});

it('skips a saved search with notifications switched off', function (): void {
    $search = savedSearch(['q' => 'passat'], Carbon::now()->subHour());
    $search->forceFill(['notify' => false])->save();

    publishedListing();

    processSavedSearches()
        ->expectsOutputToContain('Notified 0 saved searches.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(0)
        // Its marker is left alone too, so switching notifications back on does
        // not skip everything published in between.
        ->and($search->fresh()->last_notified_at->toIso8601String())
        ->toBe($search->last_notified_at->toIso8601String());
});

it('counts how many cars matched', function (): void {
    savedSearch(['q' => 'passat'], Carbon::now()->subHour());

    publishedListing();
    publishedListing();
    publishedListing();

    processSavedSearches()->assertSuccessful();

    expect($this->sender->last()['body'])->toContain('3');
});
