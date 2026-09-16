<?php

declare(strict_types=1);

use App\Enums\CreditReason;
use App\Enums\Store;
use App\Exceptions\InsufficientCreditsException;
use App\Models\CreditTransaction;
use App\Models\Listing;
use App\Models\User;
use App\Services\CreditService;

beforeEach(function (): void {
    $this->credits = app(CreditService::class);
});

it('grants credits and records the resulting balance', function (): void {
    $user = User::factory()->create();

    $transaction = $this->credits->grant($user, 8, CreditReason::Purchase, Store::Apple, 'apple-tx-1', '9.99');

    expect($this->credits->balance($user))->toBe(8)
        ->and($user->credits)->toBe(8)
        ->and($transaction->delta)->toBe(8)
        ->and($transaction->balance_after)->toBe(8)
        ->and($transaction->reason)->toBe(CreditReason::Purchase)
        ->and($transaction->store)->toBe(Store::Apple)
        ->and($transaction->price_paid_eur)->toBe('9.99');
});

it('spends credits and writes a negative ledger row', function (): void {
    $user = User::factory()->create();
    $this->credits->grant($user, 3, CreditReason::Purchase, Store::Google, 'google-tx-1');
    $listing = Listing::factory()->create(['user_id' => $user->getKey()]);

    $transaction = $this->credits->spend($user, 1, CreditReason::ListingPublish, $listing);

    expect($this->credits->balance($user))->toBe(2)
        ->and($user->credits)->toBe(2)
        ->and($transaction->delta)->toBe(-1)
        ->and($transaction->balance_after)->toBe(2)
        ->and($transaction->listing_id)->toBe($listing->getKey());
});

it('refuses to spend from a zero balance and leaves the balance untouched', function (): void {
    $user = User::factory()->create();

    expect($this->credits->balance($user))->toBe(0);

    expect(fn () => $this->credits->spend($user, 1, CreditReason::ListingPublish))
        ->toThrow(InsufficientCreditsException::class);

    expect($this->credits->balance($user))->toBe(0)
        ->and(CreditTransaction::query()->where('user_id', $user->getKey())->count())->toBe(0);
});

it('refuses to spend more than the balance covers and leaves it untouched', function (): void {
    $user = User::factory()->create();
    $this->credits->grant($user, 2, CreditReason::Promo);

    expect(fn () => $this->credits->spend($user, 3, CreditReason::ListingPublish))
        ->toThrow(InsufficientCreditsException::class);

    expect($this->credits->balance($user))->toBe(2)
        ->and(CreditTransaction::query()->where('user_id', $user->getKey())->count())->toBe(1);
});

it('reports 402 Payment Required on an insufficient balance', function (): void {
    $user = User::factory()->create();

    try {
        $this->credits->spend($user, 1, CreditReason::ListingPublish);
    } catch (InsufficientCreditsException $e) {
        expect($e->getStatusCode())->toBe(402)
            ->and($e->required)->toBe(1)
            ->and($e->available)->toBe(0);

        return;
    }

    $this->fail('The spend should not have succeeded.');
});

it('grants only once for the same store transaction id', function (): void {
    $user = User::factory()->create();

    $first = $this->credits->grant($user, 25, CreditReason::Purchase, Store::Apple, 'apple-tx-repeat', '24.99');
    $second = $this->credits->grant($user, 25, CreditReason::Purchase, Store::Apple, 'apple-tx-repeat', '24.99');

    expect($this->credits->balance($user))->toBe(25)
        ->and($second->getKey())->toBe($first->getKey())
        ->and(CreditTransaction::query()->where('store_transaction_id', 'apple-tx-repeat')->count())->toBe(1);
});

it('stays idempotent across many replays of the same webhook', function (): void {
    $user = User::factory()->create();

    foreach (range(1, 5) as $ignored) {
        $this->credits->grant($user, 8, CreditReason::Purchase, Store::Google, 'google-tx-replayed', '9.99');
    }

    expect($this->credits->balance($user))->toBe(8)
        ->and(CreditTransaction::query()->where('user_id', $user->getKey())->count())->toBe(1);
});

it('keeps separate store transaction ids separate', function (): void {
    $user = User::factory()->create();

    $this->credits->grant($user, 1, CreditReason::Purchase, Store::Apple, 'apple-tx-a', '1.50');
    $this->credits->grant($user, 1, CreditReason::Purchase, Store::Apple, 'apple-tx-b', '1.50');

    expect($this->credits->balance($user))->toBe(2)
        ->and(CreditTransaction::query()->where('user_id', $user->getKey())->count())->toBe(2);
});

it('does not let one user replay another user store transaction id', function (): void {
    $buyer = User::factory()->create();
    $other = User::factory()->create();

    $first = $this->credits->grant($buyer, 8, CreditReason::Purchase, Store::Apple, 'apple-tx-shared', '9.99');
    $second = $this->credits->grant($other, 8, CreditReason::Purchase, Store::Apple, 'apple-tx-shared', '9.99');

    expect($second->getKey())->toBe($first->getKey())
        ->and($this->credits->balance($buyer))->toBe(8)
        ->and($this->credits->balance($other))->toBe(0);
});

it('keeps balance_after in step with the running total of the ledger', function (): void {
    $user = User::factory()->create();

    $this->credits->grant($user, 8, CreditReason::Purchase, Store::Apple, 'apple-tx-ledger', '9.99');
    $this->credits->spend($user, 1, CreditReason::ListingPublish);
    $this->credits->spend($user, 1, CreditReason::Renewal);
    $this->credits->grant($user, 2, CreditReason::Refund);

    $running = 0;

    CreditTransaction::query()
        ->where('user_id', $user->getKey())
        ->orderBy('created_at')
        ->orderBy('id')
        ->each(function (CreditTransaction $transaction) use (&$running): void {
            $running += $transaction->delta;
            expect($transaction->balance_after)->toBe($running);
        });

    expect($running)->toBe(8)
        ->and($this->credits->balance($user))->toBe(8);
});

it('rejects a reason that moves credits the other way', function (): void {
    $user = User::factory()->create();

    expect(fn () => $this->credits->grant($user, 1, CreditReason::ListingPublish))
        ->toThrow(InvalidArgumentException::class);

    expect(fn () => $this->credits->spend($user, 1, CreditReason::Purchase))
        ->toThrow(InvalidArgumentException::class);
});

it('rejects a movement of zero or fewer credits', function (): void {
    $user = User::factory()->create();

    expect(fn () => $this->credits->grant($user, 0, CreditReason::Promo))
        ->toThrow(InvalidArgumentException::class);

    expect(fn () => $this->credits->spend($user, -1, CreditReason::ListingPublish))
        ->toThrow(InvalidArgumentException::class);
});

it('never exposes credits to mass assignment', function (): void {
    $user = User::factory()->create();

    $user->fill(['credits' => 999])->save();

    expect($this->credits->balance($user))->toBe(0);
});
