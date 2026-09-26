<?php

declare(strict_types=1);

use App\Enums\SponsorSlot;
use App\Enums\VehicleType;
use App\Models\Sponsor;
use Illuminate\Support\Facades\Cache;

function booking(array $attributes = []): Sponsor
{
    return Sponsor::query()->create(array_merge([
        'name' => 'A sponsor',
        'slot' => SponsorSlot::Feed,
        'image_path' => 'sponsors/home_feed/one.jpg',
        'alt' => 'Winter tyres, half price until December',
        'link_url' => 'https://example.mk',
        'position' => 0,
        'active' => true,
    ], $attributes));
}

beforeEach(function (): void {
    Cache::flush();
});

it('serves the booked sponsors without a token', function (): void {
    booking();

    $this->getJson('/api/v1/sponsors')
        ->assertOk()
        ->assertJsonPath('data.home_feed.0.name', 'A sponsor')
        ->assertJsonPath('data.home_feed.0.alt', 'Winter tyres, half price until December');
});

it('answers every slot, even the empty ones', function (): void {
    $slots = $this->getJson('/api/v1/sponsors')->assertOk()->json('data');

    // Named keys rather than only what is booked, so a client can draw its
    // three slots without knowing which of them anybody has paid for.
    expect(array_keys($slots))->toBe(SponsorSlot::values());
});

it('leaves out one that is switched off', function (): void {
    booking(['active' => false]);

    expect($this->getJson('/api/v1/sponsors')->json('data.home_feed'))->toBe([]);
});

it('leaves out a booking that has not started', function (): void {
    booking(['starts_at' => now()->addDay()]);

    expect($this->getJson('/api/v1/sponsors')->json('data.home_feed'))->toBe([]);
});

it('leaves out a booking that has finished', function (): void {
    booking(['ends_at' => now()->subMinute()]);

    expect($this->getJson('/api/v1/sponsors')->json('data.home_feed'))->toBe([]);
});

it('keeps an open-ended booking running', function (): void {
    booking(['starts_at' => now()->subMonth(), 'ends_at' => null]);

    expect($this->getJson('/api/v1/sponsors')->json('data.home_feed'))->toHaveCount(1);
});

it('shows a car sponsor beside cars and not beside motorcycles', function (): void {
    booking(['name' => 'Car tyres', 'vehicle_type' => VehicleType::Car]);

    expect($this->getJson('/api/v1/sponsors?type=car')->json('data.home_feed'))->toHaveCount(1);
    expect($this->getJson('/api/v1/sponsors?type=motorcycle')->json('data.home_feed'))->toBe([]);
});

it('shows a sponsor with no kind beside both', function (): void {
    booking(['vehicle_type' => null]);

    expect($this->getJson('/api/v1/sponsors?type=car')->json('data.home_feed'))->toHaveCount(1);
    expect($this->getJson('/api/v1/sponsors?type=motorcycle')->json('data.home_feed'))->toHaveCount(1);
});

it('orders by position, lowest first', function (): void {
    booking(['name' => 'Third', 'position' => 2]);
    booking(['name' => 'First', 'position' => 0]);
    booking(['name' => 'Second', 'position' => 1]);

    expect(collect($this->getJson('/api/v1/sponsors')->json('data.home_feed'))->pluck('name')->all())
        ->toBe(['First', 'Second', 'Third']);
});

it('sends no more than the slot is drawn at', function (): void {
    // The wide card is one card. A second booking there is a rotation nobody
    // asked for, so it is never sent rather than silently dropped by the app.
    booking(['slot' => SponsorSlot::Top, 'name' => 'One', 'position' => 0]);
    booking(['slot' => SponsorSlot::Top, 'name' => 'Two', 'position' => 1]);

    expect($this->getJson('/api/v1/sponsors')->json('data.home_top'))->toHaveCount(1);
});

it('has no way to create or change one over HTTP', function (): void {
    // The point of the whole design: bookings are added on the server. If any
    // of these ever starts answering, that decision has been undone.
    //
    // 405 on the collection, because the path exists and only takes GET; 404
    // on a single one, because no such route was ever written.
    $this->postJson('/api/v1/sponsors', ['name' => 'Anybody'])->assertStatus(405);
    $this->putJson('/api/v1/sponsors/1', [])->assertStatus(404);
    $this->patchJson('/api/v1/sponsors/1', [])->assertStatus(404);
    $this->deleteJson('/api/v1/sponsors/1')->assertStatus(404);
});

it('rejects a type it does not know rather than quietly serving cars', function (): void {
    $this->getJson('/api/v1/sponsors?type=spaceship')->assertStatus(422);
});
