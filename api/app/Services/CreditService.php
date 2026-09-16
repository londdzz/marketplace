<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CreditReason;
use App\Enums\Store;
use App\Exceptions\InsufficientCreditsException;
use App\Models\CreditTransaction;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * The only place in the application where a credit balance ever changes.
 *
 * Every change runs inside a database transaction, locks the user row with
 * lockForUpdate() so two concurrent requests cannot both read the same balance,
 * and writes a credit_transactions row carrying the resulting balance_after.
 * No controller ever touches users.credits directly.
 */
final class CreditService
{
    /**
     * Add credits to a balance.
     *
     * When a store transaction id is given the grant is idempotent: replaying
     * the same webhook returns the transaction that was already recorded
     * without granting a second time. Store webhooks retry, so every webhook is
     * assumed to arrive at least twice.
     */
    public function grant(
        User $user,
        int $amount,
        CreditReason $reason,
        ?Store $store = null,
        ?string $storeTransactionId = null,
        ?string $pricePaidEur = null,
        ?Listing $listing = null,
    ): CreditTransaction {
        $this->assertPositive($amount);

        if (! $reason->isCredit()) {
            throw new InvalidArgumentException(
                sprintf('Reason [%s] removes credits and cannot be used to grant them.', $reason->value)
            );
        }

        try {
            return DB::transaction(function () use ($user, $amount, $reason, $store, $storeTransactionId, $pricePaidEur, $listing): CreditTransaction {
                if ($storeTransactionId !== null) {
                    $existing = CreditTransaction::query()
                        ->where('store_transaction_id', $storeTransactionId)
                        ->first();

                    if ($existing instanceof CreditTransaction) {
                        return $existing;
                    }
                }

                $balance = $this->lockedBalance($user) + $amount;

                return $this->apply($user, $balance, [
                    'delta' => $amount,
                    'reason' => $reason,
                    'listing_id' => $listing?->getKey(),
                    'store' => $store,
                    'store_transaction_id' => $storeTransactionId,
                    'price_paid_eur' => $pricePaidEur,
                ]);
            });
        } catch (UniqueConstraintViolationException $e) {
            // Two copies of the same webhook raced each other. The unique index
            // on store_transaction_id is the final guard: the loser rolls back
            // and reads the row the winner wrote.
            if ($storeTransactionId === null) {
                throw $e;
            }

            return CreditTransaction::query()
                ->where('store_transaction_id', $storeTransactionId)
                ->firstOrFail();
        }
    }

    /**
     * Remove credits from a balance, failing when it cannot cover the spend.
     *
     * @throws InsufficientCreditsException
     */
    public function spend(
        User $user,
        int $amount,
        CreditReason $reason,
        ?Listing $listing = null,
    ): CreditTransaction {
        $this->assertPositive($amount);

        if ($reason->isCredit()) {
            throw new InvalidArgumentException(
                sprintf('Reason [%s] adds credits and cannot be used to spend them.', $reason->value)
            );
        }

        return DB::transaction(function () use ($user, $amount, $reason, $listing): CreditTransaction {
            $available = $this->lockedBalance($user);

            if ($available < $amount) {
                // Rolls the transaction back, so the balance is left untouched.
                throw new InsufficientCreditsException($amount, $available);
            }

            return $this->apply($user, $available - $amount, [
                'delta' => -$amount,
                'reason' => $reason,
                'listing_id' => $listing?->getKey(),
            ]);
        });
    }

    /**
     * The balance as currently stored, read straight from the database.
     */
    public function balance(User $user): int
    {
        return (int) User::query()
            ->whereKey($user->getKey())
            ->value('credits');
    }

    /**
     * Read the balance with the user row locked for the rest of the
     * transaction, so concurrent changes queue up behind it.
     */
    private function lockedBalance(User $user): int
    {
        return (int) User::query()
            ->whereKey($user->getKey())
            ->lockForUpdate()
            ->value('credits');
    }

    /**
     * Write the new balance and its ledger row.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function apply(User $user, int $balance, array $attributes): CreditTransaction
    {
        User::query()
            ->whereKey($user->getKey())
            ->update(['credits' => $balance]);

        $transaction = CreditTransaction::query()->create([
            ...$attributes,
            'user_id' => $user->getKey(),
            'balance_after' => $balance,
        ]);

        // Keep the in-memory model in step without marking the attribute dirty,
        // so a later save() cannot write a stale balance back.
        $user->credits = $balance;
        $user->syncOriginalAttribute('credits');

        return $transaction;
    }

    private function assertPositive(int $amount): void
    {
        if ($amount < 1) {
            throw new InvalidArgumentException('A credit movement must be at least 1 credit.');
        }
    }
}
