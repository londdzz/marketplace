<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    /**
     * The five markets the marketplace is built for, and which of them are
     * open.
     *
     * Launch is North Macedonia alone. The other four are seeded inactive
     * rather than left out: their cities, their dialling prefixes and their
     * currencies are already here, so opening a market is flipping `active`
     * and nothing else. `/countries` only ever returns the open ones, and a
     * listing cannot be created in a closed one.
     *
     * @var array<int, array{code: string, currency: string, phone_prefix: string, active: bool}>
     */
    private const COUNTRIES = [
        ['code' => 'MK', 'currency' => 'MKD', 'phone_prefix' => '+389', 'active' => true],
        ['code' => 'XK', 'currency' => 'EUR', 'phone_prefix' => '+383', 'active' => false],
        ['code' => 'AL', 'currency' => 'ALL', 'phone_prefix' => '+355', 'active' => false],
        ['code' => 'RS', 'currency' => 'RSD', 'phone_prefix' => '+381', 'active' => false],
        ['code' => 'BG', 'currency' => 'BGN', 'phone_prefix' => '+359', 'active' => false],
    ];

    public function run(): void
    {
        foreach (self::COUNTRIES as $country) {
            Country::query()->updateOrCreate(
                ['code' => $country['code']],
                [
                    'currency' => $country['currency'],
                    'phone_prefix' => $country['phone_prefix'],
                    'active' => $country['active'],
                ],
            );
        }
    }
}
