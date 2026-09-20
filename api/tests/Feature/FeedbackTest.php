<?php

declare(strict_types=1);

use App\Models\AppFeedback;
use App\Models\City;
use App\Models\User;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);

    $city = City::query()->where('country_code', 'MK')->firstOrFail();
    $this->user = User::factory()->create(['country_code' => 'MK', 'city_id' => $city->id]);
});

it('records what someone thinks of the app', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/feedback', ['score' => 5, 'note' => 'Found a car in a day.'])
        ->assertCreated();

    $feedback = AppFeedback::query()->sole();

    expect($feedback->score)->toBe(5)
        ->and($feedback->note)->toBe('Found a car in a day.')
        ->and($feedback->user_id)->toBe($this->user->id)
        ->and($this->user->refresh()->rated_at)->not->toBeNull();
});

it('takes a score on its own, because most people will not write anything', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/feedback', ['score' => 2])
        ->assertCreated();

    expect(AppFeedback::query()->sole()->note)->toBeNull();
});

it('changes an answer rather than counting it twice', function (): void {
    $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/feedback', ['score' => 2]);
    $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/feedback', ['score' => 5])->assertCreated();

    expect(AppFeedback::query()->count())->toBe(1)
        ->and(AppFeedback::query()->sole()->score)->toBe(5);
});

it('refuses a score off the scale', function (): void {
    foreach ([0, 6, 'great'] as $score) {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/feedback', ['score' => $score])
            ->assertStatus(422);
    }

    expect(AppFeedback::query()->count())->toBe(0);
});

it('asks nobody who is not signed in', function (): void {
    $this->postJson('/api/v1/feedback', ['score' => 5])->assertUnauthorized();
});

it('tells the app it has already been answered', function (): void {
    expect($this->actingAs($this->user, 'sanctum')->getJson('/api/v1/me')->json('data.rated_at'))
        ->toBeNull();

    $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/feedback', ['score' => 4]);

    expect($this->actingAs($this->user, 'sanctum')->getJson('/api/v1/me')->json('data.rated_at'))
        ->not->toBeNull();
});
