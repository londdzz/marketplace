<?php

declare(strict_types=1);

namespace App\Support\Rates;

use App\Contracts\ExchangeRateProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Reads rates from a JSON endpoint that answers in the shape
 * { "rates": { "ALL": 100.5, "MKD": 61.5 } }, with the euro as the base.
 *
 * Note when choosing a provider: the European Central Bank publishes neither
 * the Albanian lek nor the Macedonian denar, so an ECB-backed feed cannot cover
 * three of our five markets.
 */
final class HttpExchangeRateProvider implements ExchangeRateProvider
{
    public function ratesPerEuro(array $currencies): array
    {
        $url = (string) config('rates.http.url');

        if ($url === '') {
            throw new RuntimeException('No exchange rate URL is configured.');
        }

        $query = array_filter([
            'base' => (string) config('rates.base'),
            'symbols' => implode(',', $currencies),
            'access_key' => config('rates.http.key'),
        ]);

        $response = Http::timeout((int) config('rates.http.timeout'))->get($url, $query);

        if ($response->failed()) {
            throw new RuntimeException('The exchange rate provider answered '.$response->status().'.');
        }

        $rates = $response->json('rates');

        if (! is_array($rates)) {
            throw new RuntimeException('The exchange rate provider answered in an unexpected shape.');
        }

        $clean = [];

        foreach ($currencies as $currency) {
            $rate = $rates[$currency] ?? null;

            if (! is_numeric($rate) || (float) $rate <= 0) {
                // One missing currency must not throw away the others.
                Log::warning('The exchange rate provider returned no usable rate.', ['currency' => $currency]);

                continue;
            }

            $clean[$currency] = number_format((float) $rate, 6, '.', '');
        }

        return $clean;
    }
}
