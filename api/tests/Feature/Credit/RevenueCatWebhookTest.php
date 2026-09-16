<?php

declare(strict_types=1);

use App\Enums\CreditReason;
use App\Enums\Store;
use App\Models\CreditTransaction;
use App\Models\User;
use App\Services\CreditService;
use Database\Seeders\CountrySeeder;
use Illuminate\Testing\TestResponse;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);

    config()->set('credits.webhook.secret', 'shared-secret');

    $this->user = User::factory()->create(['country_code' => 'XK']);
    $this->credits = app(CreditService::class);
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function purchaseEvent(array $overrides = []): array
{
    return ['event' => array_merge([
        'type' => 'NON_RENEWING_PURCHASE',
        'id' => 'evt_'.fake()->uuid(),
        'app_user_id' => (string) test()->user->id,
        'product_id' => 'credits_8',
        'transaction_id' => 'txn_1000000123456789',
        'store' => 'APP_STORE',
        'price' => 9.99,
        'currency' => 'EUR',
    ], $overrides)];
}

function postWebhook(array $payload, string $secret = 'shared-secret'): TestResponse
{
    return test()->withHeader('Authorization', $secret)
        ->postJson('/api/v1/webhooks/revenuecat', $payload);
}

it('grants the credits in the pack that was bought', function (): void {
    postWebhook(purchaseEvent())
        ->assertOk()
        ->assertJsonPath('granted', true);

    expect($this->credits->balance($this->user))->toBe(8);

    $transaction = CreditTransaction::query()->sole();

    expect($transaction->delta)->toBe(8)
        ->and($transaction->reason)->toBe(CreditReason::Purchase)
        ->and($transaction->store)->toBe(Store::Apple)
        ->and($transaction->store_transaction_id)->toBe('txn_1000000123456789')
        ->and($transaction->price_paid_eur)->toBe('9.99')
        ->and($transaction->balance_after)->toBe(8);
});

it('grants once however many times the same delivery arrives', function (): void {
    $payload = purchaseEvent();

    postWebhook($payload)->assertOk();
    postWebhook($payload)->assertOk();
    postWebhook($payload)->assertOk();

    expect($this->credits->balance($this->user))->toBe(8)
        ->and(CreditTransaction::query()->count())->toBe(1);
});

it('treats a replay with a new event id but the same transaction as the same purchase', function (): void {
    postWebhook(purchaseEvent(['id' => 'evt_first']))->assertOk();
    postWebhook(purchaseEvent(['id' => 'evt_second']))->assertOk();

    expect($this->credits->balance($this->user))->toBe(8)
        ->and(CreditTransaction::query()->count())->toBe(1);
});

it('grants each pack the right number of credits', function (string $productId, int $credits, string $price): void {
    postWebhook(purchaseEvent([
        'product_id' => $productId,
        'transaction_id' => 'txn_'.$productId,
        'price' => (float) $price,
    ]))->assertOk();

    expect($this->credits->balance($this->user))->toBe($credits)
        ->and(CreditTransaction::query()->sole()->price_paid_eur)->toBe($price);
})->with([
    ['credits_1', 1, '1.50'],
    ['credits_8', 8, '9.99'],
    ['credits_25', 25, '24.99'],
]);

it('records a Play Store purchase against Google', function (): void {
    postWebhook(purchaseEvent(['store' => 'PLAY_STORE']))->assertOk();

    expect(CreditTransaction::query()->sole()->store)->toBe(Store::Google);
});

it('leaves the price empty rather than guess at a conversion', function (): void {
    postWebhook(purchaseEvent(['currency' => 'BGN', 'price' => 19.55]))->assertOk();

    $transaction = CreditTransaction::query()->sole();

    expect($transaction->price_paid_eur)->toBeNull()
        ->and($transaction->delta)->toBe(8);
});

it('refuses a delivery with the wrong secret', function (): void {
    postWebhook(purchaseEvent(), 'not-the-secret')->assertStatus(403);

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('refuses a delivery with no secret at all', function (): void {
    $this->postJson('/api/v1/webhooks/revenuecat', purchaseEvent())->assertStatus(403);

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('refuses everything when no secret is configured', function (): void {
    config()->set('credits.webhook.secret', null);

    postWebhook(purchaseEvent(), '')->assertStatus(403);
    postWebhook(purchaseEvent(), 'anything')->assertStatus(403);

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('accepts but ignores an event type that grants nothing', function (): void {
    postWebhook(purchaseEvent(['type' => 'CANCELLATION']))
        ->assertOk()
        ->assertJsonPath('granted', false);

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('accepts but ignores a product we do not sell', function (): void {
    postWebhook(purchaseEvent(['product_id' => 'credits_999']))
        ->assertOk()
        ->assertJsonPath('granted', false);

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('accepts but ignores a purchase for an account that does not exist', function (): void {
    postWebhook(purchaseEvent(['app_user_id' => '999999']))
        ->assertOk()
        ->assertJsonPath('granted', false);

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('falls back to the event id when there is no transaction id', function (): void {
    postWebhook(purchaseEvent(['transaction_id' => null, 'id' => 'evt_only']))->assertOk();

    expect(CreditTransaction::query()->sole()->store_transaction_id)->toBe('evt_only');
});

it('rejects a delivery that is not shaped like an event', function (): void {
    postWebhook(['event' => 'nonsense'])->assertStatus(422);
    postWebhook([])->assertStatus(422);

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('keeps two different purchases apart', function (): void {
    postWebhook(purchaseEvent(['transaction_id' => 'txn_one']))->assertOk();
    postWebhook(purchaseEvent(['transaction_id' => 'txn_two']))->assertOk();

    expect($this->credits->balance($this->user))->toBe(16)
        ->and(CreditTransaction::query()->count())->toBe(2);
});
