<?php

declare(strict_types=1);

namespace App\Enums;

enum Transmission: string
{
    case Manual = 'manual';
    case Automatic = 'automatic';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return 'listing.transmission.'.$this->value;
    }
}
