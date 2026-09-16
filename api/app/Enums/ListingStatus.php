<?php

declare(strict_types=1);

namespace App\Enums;

enum ListingStatus: string
{
    case Draft = 'draft';
    case PendingPayment = 'pending_payment';
    case Active = 'active';
    case Expired = 'expired';
    case Sold = 'sold';
    case Removed = 'removed';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Statuses a listing may hold while it is still visible to buyers.
     */
    public function isPubliclyVisible(): bool
    {
        return $this === self::Active;
    }

    public function label(): string
    {
        return 'listing.status.'.$this->value;
    }
}
