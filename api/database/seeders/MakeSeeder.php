<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Make;
use Illuminate\Database\Seeder;

class MakeSeeder extends Seeder
{
    /**
     * The forty makes that actually turn up on the regional used market. The
     * ten flagged popular are the ones that dominate listings across Kosovo,
     * Albania, North Macedonia, Serbia and Bulgaria, and they lead the picker.
     *
     * @var array<string, bool>
     */
    private const MAKES = [
        'Volkswagen' => true,
        'Audi' => true,
        'BMW' => true,
        'Mercedes-Benz' => true,
        'Opel' => true,
        'Škoda' => true,
        'Renault' => true,
        'Peugeot' => true,
        'Ford' => true,
        'Toyota' => true,

        'Citroën' => false,
        'Fiat' => false,
        'Seat' => false,
        'Nissan' => false,
        'Hyundai' => false,
        'Kia' => false,
        'Honda' => false,
        'Mazda' => false,
        'Volvo' => false,
        'Mitsubishi' => false,
        'Suzuki' => false,
        'Dacia' => false,
        'Chevrolet' => false,
        'Jeep' => false,
        'Land Rover' => false,
        'Mini' => false,
        'Porsche' => false,
        'Lancia' => false,
        'Alfa Romeo' => false,
        'Subaru' => false,
        'Smart' => false,
        'Chrysler' => false,
        'Dodge' => false,
        'Tesla' => false,
        'Lexus' => false,
        'Infiniti' => false,
        'Saab' => false,
        'Daewoo' => false,
        'Iveco' => false,
        'Zastava' => false,
    ];

    public function run(): void
    {
        foreach (self::MAKES as $name => $popular) {
            Make::query()->updateOrCreate(
                ['name' => $name],
                ['popular' => $popular],
            );
        }
    }
}
