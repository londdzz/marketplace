<?php

declare(strict_types=1);

namespace App\Enums;

enum CreditReason: string
{
    case Purchase = 'purchase';
    case ListingPublish = 'listing_publish';
    case Renewal = 'renewal';
    case Feature = 'feature';
    case Refund = 'refund';
    case Promo = 'promo';
    case AdminGrant = 'admin_grant';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Reasons that add credits to a balance. Every other reason spends them.
     */
    public function isCredit(): bool
    {
        return in_array($this, [self::Purchase, self::Refund, self::Promo, self::AdminGrant], true);
    }

    public function label(): string
    {
        return 'credits.reason.'.$this->value;
    }
}
