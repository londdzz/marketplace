<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ExchangeRateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * How many units of a local currency one euro buys. Prices are always stored in
 * EUR; these rates only ever convert at display time.
 */
class ExchangeRate extends Model
{
    /** @use HasFactory<ExchangeRateFactory> */
    use HasFactory;

    public const CREATED_AT = null;

    protected $primaryKey = 'currency';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'currency',
        'rate_per_eur',
    ];

    protected function casts(): array
    {
        return [
            'rate_per_eur' => 'decimal:6',
            'updated_at' => 'datetime',
        ];
    }
}
