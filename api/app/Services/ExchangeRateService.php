<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ExchangeRateProvider;
use App\Models\ExchangeRate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Keeps the local-currency rates current. Prices are always stored in euro;
 * these rates only ever convert at display time.
 */
final class ExchangeRateService
{
    public function __construct(private readonly ExchangeRateProvider $provider) {}

    /**
     * @return int how many rates were written
     */
    public function refresh(): int
    {
        $rates = $this->provider->ratesPerEuro((array) config('rates.currencies'));

        $written = 0;

        foreach ($rates as $currency => $rate) {
            ExchangeRate::query()->updateOrCreate(
                ['currency' => $currency],
                ['rate_per_eur' => $rate, 'updated_at' => Carbon::now()],
            );

            $written++;
        }

        if ($written > 0) {
            // The rates endpoint is cached, so a refresh has to clear it or the
            // apps keep converting at yesterday's numbers.
            Cache::forget('reference:exchange-rates');
        }

        return $written;
    }
}
