<?php

declare(strict_types=1);

use App\Enums\ReportReason;
use App\Models\Favorite;
use App\Models\Listing;
use App\Models\Report;
use App\Models\SavedSearch;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MakeSeeder;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(MakeSeeder::class);

    $this->user = User::factory()->create(['country_code' => 'MK']);
    $this->listing = Listing::factory()->active()->create();
});

it('saves a listing to favorites', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => $this->listing->id])
        ->assertStatus(201)
        ->assertJsonPath('data.listing_id', $this->listing->id);

    expect(Favorite::query()->count())->toBe(1);
});

it('treats saving the same listing twice as saving it once', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => $this->listing->id])
        ->assertStatus(201);

    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => $this->listing->id])
        ->assertStatus(201);

    expect(Favorite::query()->count())->toBe(1);
});

it('lists what a person saved, with the listing attached', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => $this->listing->id]);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/favorites')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.listing.id', $this->listing->id);
});

it('removes a saved listing', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => $this->listing->id]);

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/favorites/{$this->listing->id}")
        ->assertNoContent();

    expect(Favorite::query()->count())->toBe(0);
});

it('keeps one person favorites out of another person list', function (): void {
    $other = User::factory()->create(['country_code' => 'MK']);

    $this->actingAs($other, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => $this->listing->id]);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/favorites')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    // Removing what someone else saved does nothing to their list.
    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/favorites/{$this->listing->id}")
        ->assertNoContent();

    expect(Favorite::query()->count())->toBe(1);
});

it('refuses to favorite a listing that does not exist', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/favorites', ['listing_id' => '00000000-0000-0000-0000-000000000000'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('listing_id');
});

it('saves a search with the filters a buyer chose', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/saved-searches', [
            'name' => 'Diesel Passat under 8000',
            'filters' => [
                'q' => 'passat',
                'fuel' => ['diesel'],
                'price_max' => 8000,
                'countries' => ['XK', 'MK'],
            ],
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'Diesel Passat under 8000')
        ->assertJsonPath('data.notify', true)
        ->assertJsonPath('data.filters.q', 'passat');

    expect(SavedSearch::query()->sole()->user_id)->toBe($this->user->id);
});

it('refuses a saved search holding a filter search would reject', function (array $filters, string $field): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/saved-searches', ['filters' => $filters])
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);

    expect(SavedSearch::query()->count())->toBe(0);
})->with([
    [['fuel' => ['nuclear']], 'filters.fuel.0'],
    [['transmission' => 'cvt'], 'filters.transmission'],
    [['countries' => ['ZZ']], 'filters.countries.0'],
    [['sort' => 'cheapest'], 'filters.sort'],
    [['make_id' => 999999], 'filters.make_id'],
]);

it('lists and removes a persons saved searches', function (): void {
    $id = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/saved-searches', ['filters' => ['q' => 'golf']])
        ->json('data.id');

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/saved-searches')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/saved-searches/{$id}")
        ->assertNoContent();

    expect(SavedSearch::query()->count())->toBe(0);
});

it('will not let one person touch another persons saved search', function (): void {
    $other = User::factory()->create(['country_code' => 'MK']);

    $id = $this->actingAs($other, 'sanctum')
        ->postJson('/api/v1/saved-searches', ['filters' => ['q' => 'golf']])
        ->json('data.id');

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/saved-searches/{$id}")
        ->assertStatus(403);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/saved-searches')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    expect(SavedSearch::query()->count())->toBe(1);
});

it('reports a listing', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/report", [
            'reason' => ReportReason::ScamSuspected->value,
            'note' => 'Asking for a deposit up front.',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.reason', 'scam_suspected');

    $report = Report::query()->sole();

    expect($report->reporter_id)->toBe($this->user->id)
        ->and($report->listing_id)->toBe($this->listing->id)
        ->and($report->resolved_at)->toBeNull();
});

it('does not stack repeated reports from the same person', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/report", ['reason' => ReportReason::Duplicate->value]);

    $this->actingAs($this->user, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/report", ['reason' => ReportReason::Sold->value]);

    $report = Report::query()->sole();

    expect($report->reason)->toBe(ReportReason::Sold);
});

it('keeps reports from different people apart', function (): void {
    $other = User::factory()->create(['country_code' => 'MK']);

    $this->actingAs($this->user, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/report", ['reason' => ReportReason::Duplicate->value]);

    $this->actingAs($other, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/report", ['reason' => ReportReason::Offensive->value]);

    expect(Report::query()->count())->toBe(2);
});

it('refuses a reason that is not one of ours', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->postJson("/api/v1/listings/{$this->listing->id}/report", ['reason' => 'ugly_colour'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('reason');
});

it('needs a token for all of it', function (string $method, string $path): void {
    $path = str_replace('{id}', $this->listing->id, $path);

    $this->json($method, $path)->assertStatus(401);
})->with([
    ['get', '/api/v1/favorites'],
    ['post', '/api/v1/favorites'],
    ['delete', '/api/v1/favorites/{id}'],
    ['get', '/api/v1/saved-searches'],
    ['post', '/api/v1/saved-searches'],
    ['post', '/api/v1/listings/{id}/report'],
]);
