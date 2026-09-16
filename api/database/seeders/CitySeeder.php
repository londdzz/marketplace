<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    /**
     * The thirty largest cities across the five markets, six per country, with
     * coordinates so that radius search has something to work with.
     *
     * @var array<int, array{0: string, 1: string, 2: float, 3: float, 4: int}>
     */
    private const CITIES = [
        // Kosovo
        ['XK', 'Prishtinë', 42.6629, 21.1655, 198000],
        ['XK', 'Prizren', 42.2139, 20.7397, 85000],
        ['XK', 'Gjilan', 42.4637, 21.4694, 54000],
        ['XK', 'Pejë', 42.6591, 20.2883, 48000],
        ['XK', 'Mitrovicë', 42.8914, 20.8660, 46000],
        ['XK', 'Ferizaj', 42.3706, 21.1483, 42000],

        // Albania
        ['AL', 'Tiranë', 41.3275, 19.8187, 557000],
        ['AL', 'Durrës', 41.3231, 19.4414, 113000],
        ['AL', 'Vlorë', 40.4667, 19.4897, 104000],
        ['AL', 'Elbasan', 41.1125, 20.0822, 78000],
        ['AL', 'Shkodër', 42.0693, 19.5033, 77000],
        ['AL', 'Fier', 40.7239, 19.5567, 55000],

        // North Macedonia
        ['MK', 'Skopje', 41.9981, 21.4254, 526000],
        ['MK', 'Kumanovo', 42.1322, 21.7144, 70000],
        ['MK', 'Bitola', 41.0297, 21.3292, 69000],
        ['MK', 'Prilep', 41.3464, 21.5542, 66000],
        ['MK', 'Tetovo', 42.0106, 20.9714, 52000],
        ['MK', 'Ohrid', 41.1172, 20.8016, 42000],

        // Serbia
        ['RS', 'Beograd', 44.7866, 20.4489, 1197000],
        ['RS', 'Novi Sad', 45.2671, 19.8335, 260000],
        ['RS', 'Niš', 43.3209, 21.8958, 183000],
        ['RS', 'Kragujevac', 44.0142, 20.9394, 150000],
        ['RS', 'Subotica', 46.1005, 19.6651, 97000],
        ['RS', 'Zrenjanin', 45.3816, 20.3897, 76000],

        // Bulgaria
        ['BG', 'Sofia', 42.6977, 23.3219, 1241000],
        ['BG', 'Plovdiv', 42.1354, 24.7453, 346000],
        ['BG', 'Varna', 43.2141, 27.9147, 336000],
        ['BG', 'Burgas', 42.5048, 27.4626, 202000],
        ['BG', 'Ruse', 43.8356, 25.9657, 142000],
        ['BG', 'Stara Zagora', 42.4258, 25.6345, 136000],
    ];

    public function run(): void
    {
        foreach (self::CITIES as [$countryCode, $name, $latitude, $longitude, $population]) {
            City::query()->updateOrCreate(
                ['country_code' => $countryCode, 'name' => $name],
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'population' => $population,
                ],
            );
        }
    }
}
