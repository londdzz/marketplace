<?php

declare(strict_types=1);

namespace App\Enums;

enum FuelType: string
{
    case Diesel = 'diesel';
    case Petrol = 'petrol';
    case Hybrid = 'hybrid';
    case Electric = 'electric';
    case Lpg = 'lpg';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return 'listing.fuel.'.$this->value;
    }
}
