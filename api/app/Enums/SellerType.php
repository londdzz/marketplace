<?php

declare(strict_types=1);

namespace App\Enums;

enum SellerType: string
{
    case Private = 'private';
    case Dealer = 'dealer';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return 'user.seller_type.'.$this->value;
    }
}
