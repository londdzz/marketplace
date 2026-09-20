<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Make;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;

/**
 * Models for every make flagged popular. The long tail of models for the
 * remaining makes is filled in from real listing data after launch.
 */
class VehicleModelSeeder extends Seeder
{
    /**
     * Models for every make flagged popular, each with the shape it is
     * usually built in.
     *
     * The shape is the range's, not a particular car's: a Passat is a saloon
     * here even though half of them on the road are estates, because our list
     * names ranges rather than variants. It is a starting point the seller can
     * change, not the last word — see the sell flow's shape step.
     *
     * @var array<string, array<string, string>>
     */
    private const MODELS = [
        'Volkswagen' => [
            'Golf' => 'hatchback',
            'Passat' => 'sedan',
            'Polo' => 'hatchback',
            'Tiguan' => 'suv',
            'Touran' => 'minivan',
            'Caddy' => 'van',
            'Jetta' => 'sedan',
            'Sharan' => 'minivan',
            'T-Roc' => 'suv',
            'T-Cross' => 'suv',
            'Touareg' => 'suv',
            'Arteon' => 'sedan',
            'Bora' => 'sedan',
            'Up' => 'hatchback',
            'Transporter' => 'van',
            'Amarok' => 'pickup',
            'Scirocco' => 'coupe',
            'Beetle' => 'hatchback',
            'Fox' => 'hatchback',
            'ID.3' => 'hatchback',
            'ID.4' => 'suv',
        ],
        'Audi' => [
            'A1' => 'hatchback',
            'A2' => 'hatchback',
            'A3' => 'hatchback',
            'A4' => 'sedan',
            'A5' => 'coupe',
            'A6' => 'sedan',
            'A7' => 'sedan',
            'A8' => 'sedan',
            'Q2' => 'suv',
            'Q3' => 'suv',
            'Q5' => 'suv',
            'Q7' => 'suv',
            'Q8' => 'suv',
            'TT' => 'coupe',
            'S3' => 'hatchback',
            'S4' => 'sedan',
            'RS6' => 'estate',
            'e-tron' => 'suv',
        ],
        'BMW' => [
            'Series 1' => 'hatchback',
            'Series 2' => 'coupe',
            'Series 3' => 'sedan',
            'Series 4' => 'coupe',
            'Series 5' => 'sedan',
            'Series 6' => 'coupe',
            'Series 7' => 'sedan',
            'Series 8' => 'coupe',
            'X1' => 'suv',
            'X2' => 'suv',
            'X3' => 'suv',
            'X4' => 'suv',
            'X5' => 'suv',
            'X6' => 'suv',
            'X7' => 'suv',
            'Z3' => 'convertible',
            'Z4' => 'convertible',
            'i3' => 'hatchback',
            'i4' => 'sedan',
            'M3' => 'sedan',
            'M5' => 'sedan',
        ],
        'Mercedes-Benz' => [
            'A-Class' => 'hatchback',
            'B-Class' => 'minivan',
            'C-Class' => 'sedan',
            'E-Class' => 'sedan',
            'S-Class' => 'sedan',
            'CLA' => 'sedan',
            'CLK' => 'coupe',
            'CLS' => 'sedan',
            'GLA' => 'suv',
            'GLB' => 'suv',
            'GLC' => 'suv',
            'GLE' => 'suv',
            'GLK' => 'suv',
            'GLS' => 'suv',
            'ML' => 'suv',
            'SLK' => 'convertible',
            'Vito' => 'van',
            'Viano' => 'minivan',
            'V-Class' => 'minivan',
            'Sprinter' => 'van',
        ],
        'Opel' => [
            'Astra' => 'hatchback',
            'Corsa' => 'hatchback',
            'Insignia' => 'sedan',
            'Zafira' => 'minivan',
            'Vectra' => 'sedan',
            'Meriva' => 'minivan',
            'Mokka' => 'suv',
            'Crossland' => 'suv',
            'Grandland' => 'suv',
            'Combo' => 'van',
            'Vivaro' => 'van',
            'Antara' => 'suv',
            'Agila' => 'hatchback',
            'Signum' => 'hatchback',
            'Omega' => 'sedan',
            'Frontera' => 'suv',
        ],
        'Škoda' => [
            'Octavia' => 'hatchback',
            'Fabia' => 'hatchback',
            'Superb' => 'sedan',
            'Rapid' => 'hatchback',
            'Yeti' => 'suv',
            'Kodiaq' => 'suv',
            'Karoq' => 'suv',
            'Kamiq' => 'suv',
            'Scala' => 'hatchback',
            'Roomster' => 'minivan',
            'Felicia' => 'hatchback',
            'Citigo' => 'hatchback',
            'Enyaq' => 'suv',
        ],
        'Renault' => [
            'Clio' => 'hatchback',
            'Megane' => 'hatchback',
            'Scenic' => 'minivan',
            'Captur' => 'suv',
            'Kadjar' => 'suv',
            'Laguna' => 'hatchback',
            'Espace' => 'minivan',
            'Twingo' => 'hatchback',
            'Trafic' => 'van',
            'Kangoo' => 'van',
            'Talisman' => 'sedan',
            'Koleos' => 'suv',
            'Fluence' => 'sedan',
            'Master' => 'van',
            'Zoe' => 'hatchback',
        ],
        'Peugeot' => [
            '106' => 'hatchback',
            '107' => 'hatchback',
            '108' => 'hatchback',
            '206' => 'hatchback',
            '207' => 'hatchback',
            '208' => 'hatchback',
            '301' => 'sedan',
            '306' => 'hatchback',
            '307' => 'hatchback',
            '308' => 'hatchback',
            '406' => 'sedan',
            '407' => 'sedan',
            '508' => 'sedan',
            '2008' => 'suv',
            '3008' => 'suv',
            '5008' => 'suv',
            'Partner' => 'van',
            'Expert' => 'van',
            'Boxer' => 'van',
            'Rifter' => 'minivan',
        ],
        'Ford' => [
            'Fiesta' => 'hatchback',
            'Focus' => 'hatchback',
            'Mondeo' => 'sedan',
            'Kuga' => 'suv',
            'Puma' => 'suv',
            'C-Max' => 'minivan',
            'S-Max' => 'minivan',
            'Galaxy' => 'minivan',
            'Transit' => 'van',
            'Transit Connect' => 'van',
            'Ranger' => 'pickup',
            'EcoSport' => 'suv',
            'Escort' => 'hatchback',
            'Ka' => 'hatchback',
            'Explorer' => 'suv',
            'Edge' => 'suv',
            'Mustang' => 'coupe',
        ],
        'Toyota' => [
            'Corolla' => 'sedan',
            'Yaris' => 'hatchback',
            'Auris' => 'hatchback',
            'Avensis' => 'sedan',
            'RAV4' => 'suv',
            'C-HR' => 'suv',
            'Land Cruiser' => 'suv',
            'Hilux' => 'pickup',
            'Prius' => 'hatchback',
            'Camry' => 'sedan',
            'Aygo' => 'hatchback',
            'Verso' => 'minivan',
            'Proace' => 'van',
            'Supra' => 'coupe',
            'Celica' => 'coupe',
        ],
    ];

    public function run(): void
    {
        foreach (self::MODELS as $makeName => $models) {
            $make = Make::query()->where('name', $makeName)->first();

            if (! $make instanceof Make) {
                continue;
            }

            foreach ($models as $model => $bodyType) {
                VehicleModel::query()->updateOrCreate(
                    ['make_id' => $make->getKey(), 'name' => $model],
                    ['body_type' => $bodyType],
                );
            }
        }
    }
}
