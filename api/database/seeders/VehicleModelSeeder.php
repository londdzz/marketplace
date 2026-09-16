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
     * @var array<string, array<int, string>>
     */
    private const MODELS = [
        'Volkswagen' => [
            'Golf', 'Passat', 'Polo', 'Tiguan', 'Touran', 'Caddy', 'Jetta', 'Sharan', 'T-Roc',
            'T-Cross', 'Touareg', 'Arteon', 'Bora', 'Up', 'Transporter', 'Amarok', 'Scirocco',
            'Beetle', 'Fox', 'ID.3', 'ID.4',
        ],
        'Audi' => [
            'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8',
            'TT', 'S3', 'S4', 'RS6', 'e-tron',
        ],
        'BMW' => [
            'Series 1', 'Series 2', 'Series 3', 'Series 4', 'Series 5', 'Series 6', 'Series 7',
            'Series 8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z3', 'Z4', 'i3', 'i4', 'M3', 'M5',
        ],
        'Mercedes-Benz' => [
            'A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLK', 'CLS', 'GLA',
            'GLB', 'GLC', 'GLE', 'GLK', 'GLS', 'ML', 'SLK', 'Vito', 'Viano', 'V-Class', 'Sprinter',
        ],
        'Opel' => [
            'Astra', 'Corsa', 'Insignia', 'Zafira', 'Vectra', 'Meriva', 'Mokka', 'Crossland',
            'Grandland', 'Combo', 'Vivaro', 'Antara', 'Agila', 'Signum', 'Omega', 'Frontera',
        ],
        'Škoda' => [
            'Octavia', 'Fabia', 'Superb', 'Rapid', 'Yeti', 'Kodiaq', 'Karoq', 'Kamiq', 'Scala',
            'Roomster', 'Felicia', 'Citigo', 'Enyaq',
        ],
        'Renault' => [
            'Clio', 'Megane', 'Scenic', 'Captur', 'Kadjar', 'Laguna', 'Espace', 'Twingo',
            'Trafic', 'Kangoo', 'Talisman', 'Koleos', 'Fluence', 'Master', 'Zoe',
        ],
        'Peugeot' => [
            '106', '107', '108', '206', '207', '208', '301', '306', '307', '308', '406', '407',
            '508', '2008', '3008', '5008', 'Partner', 'Expert', 'Boxer', 'Rifter',
        ],
        'Ford' => [
            'Fiesta', 'Focus', 'Mondeo', 'Kuga', 'Puma', 'C-Max', 'S-Max', 'Galaxy', 'Transit',
            'Transit Connect', 'Ranger', 'EcoSport', 'Escort', 'Ka', 'Explorer', 'Edge', 'Mustang',
        ],
        'Toyota' => [
            'Corolla', 'Yaris', 'Auris', 'Avensis', 'RAV4', 'C-HR', 'Land Cruiser', 'Hilux',
            'Prius', 'Camry', 'Aygo', 'Verso', 'Proace', 'Supra', 'Celica',
        ],
    ];

    public function run(): void
    {
        foreach (self::MODELS as $makeName => $models) {
            $make = Make::query()->where('name', $makeName)->first();

            if (! $make instanceof Make) {
                continue;
            }

            foreach ($models as $model) {
                VehicleModel::query()->updateOrCreate(
                    ['make_id' => $make->getKey(), 'name' => $model],
                    [],
                );
            }
        }
    }
}
