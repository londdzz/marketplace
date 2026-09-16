<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\ExchangeRateService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Refreshes the local-currency rates the apps convert prices with.
 *
 * A failure here is not fatal: yesterday's rates keep working, and prices are
 * stored in euro regardless.
 */
class RefreshExchangeRates extends Command
{
    protected $signature = 'rates:refresh';

    protected $description = 'Refresh the exchange rates used for local-currency display';

    public function handle(ExchangeRateService $rates): int
    {
        try {
            $written = $rates->refresh();
        } catch (Throwable $e) {
            $this->error('Could not refresh exchange rates: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info("Refreshed {$written} exchange rates.");

        return self::SUCCESS;
    }
}
