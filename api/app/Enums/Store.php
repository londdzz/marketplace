<?php

declare(strict_types=1);

namespace App\Enums;

enum Store: string
{
    case Apple = 'apple';
    case Google = 'google';
    case Promo = 'promo';
    case Admin = 'admin';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Stores that represent a real paid transaction and therefore require an
     * idempotency key (store_transaction_id).
     */
    public function requiresTransactionId(): bool
    {
        return in_array($this, [self::Apple, self::Google], true);
    }
}
