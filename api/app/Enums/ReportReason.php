<?php

declare(strict_types=1);

namespace App\Enums;

enum ReportReason: string
{
    case Duplicate = 'duplicate';
    case WrongCategory = 'wrong_category';
    case ScamSuspected = 'scam_suspected';
    case Sold = 'sold';
    case Offensive = 'offensive';
    case Other = 'other';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return 'report.reason.'.$this->value;
    }
}
