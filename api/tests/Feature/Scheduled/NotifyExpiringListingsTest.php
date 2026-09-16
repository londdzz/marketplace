<?php

declare(strict_types=1);

use App\Contracts\PushSender;
use App\Enums\Platform;
use App\Models\DeviceToken;
use App\Models\Listing;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Carbon;
use Tests\Support\RecordingPushSender;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    $this->sender = new RecordingPushSender;
    $this->app->instance(PushSender::class, $this->sender);

    $this->seller = User::factory()->create(['country_code' => 'XK', 'preferred_language' => 'mk']);

    DeviceToken::query()->create([
        'user_id' => $this->seller->id,
        'token' => 'seller-phone',
        'platform' => Platform::Ios,
    ]);
});

it('warns a seller whose listing runs out within two days', function (): void {
    $listing = Listing::factory()->active()->create([
        'user_id' => $this->seller->id,
        'expires_at' => Carbon::now()->addHours(30),
    ]);

    $this->artisan('listings:notify-expiring')
        ->expectsOutputToContain('Notified 1 sellers.')
        ->assertSuccessful();

    $sent = $this->sender->last();

    expect($this->sender->count())->toBe(1)
        ->and($sent['user_id'])->toBe($this->seller->id)
        ->and($sent['title'])->toBe(trans('push.listing_expiring.title', [], 'mk'))
        ->and($sent['data'])->toBe(['type' => 'listing_expiring', 'listing_id' => $listing->id]);
});

it('names the car in the notification', function (): void {
    $make = Make::query()->create(['name' => 'Volkswagen']);
    $model = VehicleModel::query()->create(['make_id' => $make->id, 'name' => 'Passat']);

    Listing::factory()->active()->create([
        'user_id' => $this->seller->id,
        'make_id' => $make->id,
        'model_id' => $model->id,
        'year' => 2015,
        'expires_at' => Carbon::now()->addHours(30),
    ]);

    $this->artisan('listings:notify-expiring')->assertSuccessful();

    expect($this->sender->last()['body'])->toContain('Volkswagen Passat 2015');
});

it('says nothing about a listing with longer to run', function (): void {
    Listing::factory()->active()->create([
        'user_id' => $this->seller->id,
        'expires_at' => Carbon::now()->addDays(10),
    ]);

    $this->artisan('listings:notify-expiring')
        ->expectsOutputToContain('Notified 0 sellers.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(0);
});

it('says nothing about a listing that already ran out', function (): void {
    Listing::factory()->active()->create([
        'user_id' => $this->seller->id,
        'expires_at' => Carbon::now()->subHour(),
    ]);

    $this->artisan('listings:notify-expiring')->assertSuccessful();

    expect($this->sender->count())->toBe(0);
});

it('says nothing about a listing that is not live', function (): void {
    Listing::factory()->create([
        'user_id' => $this->seller->id,
        'expires_at' => Carbon::now()->addHours(30),
    ]);

    $this->artisan('listings:notify-expiring')->assertSuccessful();

    expect($this->sender->count())->toBe(0);
});

it('warns about each listing only once', function (): void {
    Listing::factory()->active()->create([
        'user_id' => $this->seller->id,
        'expires_at' => Carbon::now()->addHours(30),
    ]);

    $this->artisan('listings:notify-expiring')->assertSuccessful();

    // A day later the window has moved past it.
    Carbon::setTestNow(Carbon::now()->addDay());

    $this->artisan('listings:notify-expiring')
        ->expectsOutputToContain('Notified 0 sellers.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(1);

    Carbon::setTestNow();
});

it('warns several sellers in one run', function (): void {
    $second = User::factory()->create(['country_code' => 'XK']);
    DeviceToken::query()->create([
        'user_id' => $second->id,
        'token' => 'second-phone',
        'platform' => Platform::Android,
    ]);

    Listing::factory()->active()->create(['user_id' => $this->seller->id, 'expires_at' => Carbon::now()->addHours(30)]);
    Listing::factory()->active()->create(['user_id' => $second->id, 'expires_at' => Carbon::now()->addHours(40)]);

    $this->artisan('listings:notify-expiring')
        ->expectsOutputToContain('Notified 2 sellers.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(2);
});

it('still counts a seller who has registered no device', function (): void {
    $silent = User::factory()->create(['country_code' => 'XK']);

    Listing::factory()->active()->create(['user_id' => $silent->id, 'expires_at' => Carbon::now()->addHours(30)]);

    $this->artisan('listings:notify-expiring')
        ->expectsOutputToContain('Notified 1 sellers.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(0);
});

it('says nothing about a listing that was warned about yesterday', function (): void {
    // The job runs daily and looks at the window from twenty-four to forty-eight
    // hours out, so each listing passes through it exactly once. A listing with
    // twenty hours left has already had its warning.
    Listing::factory()->active()->create([
        'user_id' => $this->seller->id,
        'expires_at' => Carbon::now()->addHours(20),
    ]);

    $this->artisan('listings:notify-expiring')
        ->expectsOutputToContain('Notified 0 sellers.')
        ->assertSuccessful();

    expect($this->sender->count())->toBe(0);
});

it('warns about a listing sitting right on the far edge of the window', function (): void {
    Listing::factory()->active()->create([
        'user_id' => $this->seller->id,
        'expires_at' => Carbon::now()->addHours(47)->addMinutes(59),
    ]);

    $this->artisan('listings:notify-expiring')
        ->expectsOutputToContain('Notified 1 sellers.')
        ->assertSuccessful();
});
