<?php

declare(strict_types=1);

namespace App\Contracts;

interface ExchangeRateProvider
{
    /**
     * How many units of each currency one euro buys.
     *
     * @param  array<int, string>  $currencies
     * @return array<string, string> currency code to rate, as a decimal string
     */
    public function ratesPerEuro(array $currencies): array;
}
