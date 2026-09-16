<?php

declare(strict_types=1);

namespace App\Support\Rates;

use App\Contracts\ExchangeRateProvider;
use Illuminate\Support\Facades\Log;

/**
 * Fetches nothing, so the seeded starting rates stay as they are. The default
 * until a provider is chosen and paid for.
 */
final class NullExchangeRateProvider implements ExchangeRateProvider
{
    public function ratesPerEuro(array $currencies): array
    {
        Log::info('Exchange rates were not refreshed: no provider is configured.');

        return [];
    }
}
