<?php

declare(strict_types=1);

namespace App\Enums;

enum Platform: string
{
    case Ios = 'ios';
    case Android = 'android';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
