<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    /**
     * The five markets the marketplace covers.
     *
     * @var array<int, array{code: string, currency: string, phone_prefix: string}>
     */
    private const COUNTRIES = [
        ['code' => 'XK', 'currency' => 'EUR', 'phone_prefix' => '+383'],
        ['code' => 'AL', 'currency' => 'ALL', 'phone_prefix' => '+355'],
        ['code' => 'MK', 'currency' => 'MKD', 'phone_prefix' => '+389'],
        ['code' => 'RS', 'currency' => 'RSD', 'phone_prefix' => '+381'],
        ['code' => 'BG', 'currency' => 'BGN', 'phone_prefix' => '+359'],
    ];

    public function run(): void
    {
        foreach (self::COUNTRIES as $country) {
            Country::query()->updateOrCreate(
                ['code' => $country['code']],
                [
                    'currency' => $country['currency'],
                    'phone_prefix' => $country['phone_prefix'],
                    'active' => true,
                ],
            );
        }
    }
}
