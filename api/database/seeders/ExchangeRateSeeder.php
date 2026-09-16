<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ExchangeRate;
use Illuminate\Database\Seeder;

/**
 * Starting values only, so local-currency display works on a fresh database.
 * The daily 06:00 job refreshes them from the rates provider.
 */
class ExchangeRateSeeder extends Seeder
{
    /**
     * @var array<string, string>
     */
    private const RATES = [
        'EUR' => '1.000000',
        'ALL' => '100.500000',
        'MKD' => '61.500000',
        'RSD' => '117.200000',
        'BGN' => '1.955830',
    ];

    public function run(): void
    {
        foreach (self::RATES as $currency => $rate) {
            ExchangeRate::query()->updateOrCreate(
                ['currency' => $currency],
                ['rate_per_eur' => $rate],
            );
        }
    }
}
