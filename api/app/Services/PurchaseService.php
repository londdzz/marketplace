<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CreditReason;
use App\Enums\Store;
use App\Models\CreditTransaction;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Turns a store purchase, as reported by RevenueCat, into credits.
 *
 * Webhooks retry, so this is written on the assumption that every event arrives
 * at least twice. Granting is idempotent on the store transaction id, which
 * carries a unique index.
 */
final class PurchaseService
{
    public function __construct(private readonly CreditService $credits) {}

    /**
     * Handle one RevenueCat event.
     *
     * Returns the ledger row when credits were granted, or null when the event
     * was not something that grants any. A null is not a failure: the webhook
     * still answers 200 so RevenueCat stops retrying an event we will never
     * act on.
     *
     * @param  array<string, mixed>  $event
     */
    public function handle(array $event): ?CreditTransaction
    {
        $type = (string) ($event['type'] ?? '');

        if (! in_array($type, (array) config('credits.webhook.purchase_events'), true)) {
            Log::info('RevenueCat event ignored.', ['type' => $type, 'event_id' => $event['id'] ?? null]);

            return null;
        }

        $productId = (string) ($event['product_id'] ?? '');
        $pack = config('credits.packs.'.$productId);

        if ($pack === null) {
            Log::error('RevenueCat reported a purchase of an unknown product.', [
                'product_id' => $productId,
                'event_id' => $event['id'] ?? null,
            ]);

            return null;
        }

        $user = $this->resolveUser($event);

        if (! $user instanceof User) {
            return null;
        }

        $transactionId = $this->transactionId($event);

        if ($transactionId === null) {
            Log::error('RevenueCat purchase arrived without a transaction id.', [
                'event_id' => $event['id'] ?? null,
            ]);

            return null;
        }

        return $this->credits->grant(
            user: $user,
            amount: (int) $pack['credits'],
            reason: CreditReason::Purchase,
            store: $this->store($event),
            storeTransactionId: $transactionId,
            pricePaidEur: $this->priceEur($event, $pack),
        );
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function resolveUser(array $event): ?User
    {
        $appUserId = $event['app_user_id'] ?? null;

        $user = User::query()->find($appUserId);

        if (! $user instanceof User) {
            // Retrying will not conjure the account, so this is logged loudly
            // and the delivery is accepted rather than looped forever.
            Log::error('RevenueCat purchase for an unknown account.', [
                'app_user_id' => $appUserId,
                'event_id' => $event['id'] ?? null,
            ]);

            return null;
        }

        return $user;
    }

    /**
     * The store's own identifier for the purchase, which is what makes a
     * replayed webhook harmless.
     *
     * @param  array<string, mixed>  $event
     */
    private function transactionId(array $event): ?string
    {
        foreach (['transaction_id', 'original_transaction_id', 'id'] as $key) {
            $value = $event[$key] ?? null;

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function store(array $event): Store
    {
        return match (strtoupper((string) ($event['store'] ?? ''))) {
            'APP_STORE', 'MAC_APP_STORE' => Store::Apple,
            'PLAY_STORE' => Store::Google,
            'PROMOTIONAL' => Store::Promo,
            default => Store::Apple,
        };
    }

    /**
     * What the buyer paid, in euro.
     *
     * RevenueCat reports the amount in the currency of the store front. Only a
     * euro amount is recorded; anything else is left null rather than converted
     * at a rate that was not the one the buyer saw.
     *
     * @param  array<string, mixed>  $event
     * @param  array<string, mixed>  $pack
     */
    private function priceEur(array $event, array $pack): ?string
    {
        $currency = strtoupper((string) ($event['currency'] ?? ''));
        $price = $event['price'] ?? null;

        if ($currency === 'EUR' && is_numeric($price)) {
            return number_format((float) $price, 2, '.', '');
        }

        return null;
    }
}
