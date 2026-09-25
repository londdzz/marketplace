<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\CreditReason;
use App\Enums\FuelType;
use App\Enums\SellerType;
use App\Enums\Transmission;
use App\Enums\VehicleType;
use App\Models\City;
use App\Models\Listing;
use App\Models\Make;
use App\Models\User;
use App\Models\VehicleModel;
use App\Services\CreditService;
use App\Services\ListingPhotoService;
use App\Services\ListingService;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;

/**
 * Published listings to develop and screenshot against.
 *
 * Never called from DatabaseSeeder: this is for a developer machine, not for a
 * real database. It goes through CreditService and ListingService like any
 * other caller, so what it produces is indistinguishable from a listing a
 * seller published, photo pipeline included.
 */
class DevListingSeeder extends Seeder
{
    /**
     * @var array<int, array{make: string, model: string, variant: string, year: int, km: int, fuel: FuelType, gearbox: Transmission, hp: int, price: string, city: string, body: string, photo: string, colour: array{int, int, int}, type?: VehicleType}>
     */
    private const CARS = [
        ['make' => 'Volkswagen', 'model' => 'Passat', 'photo' => 'passat', 'variant' => '2.0 TDI Highline', 'body' => 'sedan', 'year' => 2016, 'km' => 168000, 'fuel' => FuelType::Diesel, 'gearbox' => Transmission::Manual, 'hp' => 150, 'price' => '8950.00', 'city' => 'Skopje', 'colour' => [38, 54, 78]],
        ['make' => 'Audi', 'model' => 'A4', 'photo' => 'a4', 'variant' => 'Avant 2.0 TDI quattro', 'body' => 'estate', 'year' => 2018, 'km' => 121000, 'fuel' => FuelType::Diesel, 'gearbox' => Transmission::Automatic, 'hp' => 190, 'price' => '12400.00', 'city' => 'Skopje', 'colour' => [82, 86, 92]],
        ['make' => 'Škoda', 'model' => 'Octavia', 'photo' => 'octavia', 'variant' => '1.6 TDI Ambition', 'body' => 'hatchback', 'year' => 2015, 'km' => 198000, 'fuel' => FuelType::Diesel, 'gearbox' => Transmission::Manual, 'hp' => 110, 'price' => '7300.00', 'city' => 'Tetovo', 'colour' => [140, 146, 150]],
        ['make' => 'BMW', 'model' => '3 Series', 'photo' => 'series-3', 'variant' => '320d Touring', 'body' => 'estate', 'year' => 2019, 'km' => 96000, 'fuel' => FuelType::Diesel, 'gearbox' => Transmission::Automatic, 'hp' => 190, 'price' => '14900.00', 'city' => 'Kumanovo', 'colour' => [26, 30, 36]],
        ['make' => 'Mercedes-Benz', 'model' => 'C-Class', 'photo' => 'c-class', 'variant' => 'C 220 d AMG Line', 'body' => 'sedan', 'year' => 2017, 'km' => 143000, 'fuel' => FuelType::Diesel, 'gearbox' => Transmission::Automatic, 'hp' => 170, 'price' => '16500.00', 'city' => 'Ohrid', 'colour' => [198, 200, 204]],
        ['make' => 'Golf', 'model' => 'Golf', 'photo' => 'golf', 'variant' => '1.6 TDI Comfortline', 'body' => 'hatchback', 'year' => 2014, 'km' => 212000, 'fuel' => FuelType::Diesel, 'gearbox' => Transmission::Manual, 'hp' => 105, 'price' => '6200.00', 'city' => 'Prilep', 'colour' => [156, 42, 44]],
        ['make' => 'Opel', 'model' => 'Astra', 'photo' => 'astra', 'variant' => '1.6 CDTI Innovation', 'body' => 'hatchback', 'year' => 2017, 'km' => 134000, 'fuel' => FuelType::Diesel, 'gearbox' => Transmission::Manual, 'hp' => 136, 'price' => '8100.00', 'city' => 'Bitola', 'colour' => [60, 90, 120]],
        ['make' => 'Toyota', 'model' => 'Corolla', 'photo' => 'corolla', 'variant' => '1.8 Hybrid Comfort', 'body' => 'sedan', 'year' => 2020, 'km' => 64000, 'fuel' => FuelType::Hybrid, 'gearbox' => Transmission::Automatic, 'hp' => 122, 'price' => '17900.00', 'city' => 'Bitola', 'colour' => [235, 238, 240]],

        // Motorcycles, so the other half of the catalogue is not an empty
        // screen to develop and screenshot against. Five kinds, because the
        // browse rail is only worth looking at with more than one shape in it.
        ['type' => VehicleType::Motorcycle, 'make' => 'Yamaha', 'model' => 'MT-07', 'photo' => 'mt-07', 'variant' => 'ABS', 'body' => 'naked', 'year' => 2019, 'km' => 21000, 'fuel' => FuelType::Petrol, 'gearbox' => Transmission::Manual, 'hp' => 74, 'price' => '6200.00', 'city' => 'Skopje', 'colour' => [30, 34, 40]],
        ['type' => VehicleType::Motorcycle, 'make' => 'Honda', 'model' => 'PCX 125', 'photo' => 'pcx-125', 'variant' => '', 'body' => 'scooter', 'year' => 2021, 'km' => 9400, 'fuel' => FuelType::Petrol, 'gearbox' => Transmission::Automatic, 'hp' => 12, 'price' => '2450.00', 'city' => 'Skopje', 'colour' => [180, 186, 190]],
        ['type' => VehicleType::Motorcycle, 'make' => 'BMW', 'model' => 'R 1250 GS', 'photo' => 'r1250gs', 'variant' => 'Adventure', 'body' => 'adventure', 'year' => 2020, 'km' => 38000, 'fuel' => FuelType::Petrol, 'gearbox' => Transmission::Manual, 'hp' => 136, 'price' => '15800.00', 'city' => 'Ohrid', 'colour' => [46, 76, 96]],
        ['type' => VehicleType::Motorcycle, 'make' => 'Kawasaki', 'model' => 'Ninja 400', 'photo' => 'ninja-400', 'variant' => '', 'body' => 'sport', 'year' => 2018, 'km' => 17600, 'fuel' => FuelType::Petrol, 'gearbox' => Transmission::Manual, 'hp' => 45, 'price' => '4300.00', 'city' => 'Bitola', 'colour' => [22, 108, 62]],
        ['type' => VehicleType::Motorcycle, 'make' => 'Harley-Davidson', 'model' => 'Iron 883', 'photo' => 'iron-883', 'variant' => 'Sportster', 'body' => 'cruiser', 'year' => 2016, 'km' => 24500, 'fuel' => FuelType::Petrol, 'gearbox' => Transmission::Manual, 'hp' => 51, 'price' => '7900.00', 'city' => 'Tetovo', 'colour' => [40, 38, 36]],
        ['type' => VehicleType::Motorcycle, 'make' => 'Vespa', 'model' => 'Primavera 125', 'photo' => 'primavera', 'variant' => '', 'body' => 'scooter', 'year' => 2022, 'km' => 5200, 'fuel' => FuelType::Petrol, 'gearbox' => Transmission::Automatic, 'hp' => 11, 'price' => '3600.00', 'city' => 'Kumanovo', 'colour' => [214, 206, 180]],
    ];

    public function run(): void
    {
        // Every car sits in an open market. Cities in the markets that are not
        // open yet are seeded and waiting, but nothing is published there.
        $credits = app(CreditService::class);
        $listings = app(ListingService::class);
        $photos = app(ListingPhotoService::class);

        foreach (self::CARS as $index => $car) {
            $city = City::query()->where('name', $car['city'])->first();

            if (! $city instanceof City) {
                continue;
            }

            $type = $car['type'] ?? VehicleType::Car;

            $make = Make::query()->where('name', $car['make'] === 'Golf' ? 'Volkswagen' : $car['make'])->first();
            // The kind matters here for the same reason it matters everywhere:
            // BMW sells both, and a Series 3 and an R 1250 GS are both BMWs.
            $model = $make === null
                ? null
                : VehicleModel::query()
                    ->where('make_id', $make->getKey())
                    ->where('vehicle_type', $type)
                    ->where('name', $car['model'])
                    ->first();

            if ($make === null || $model === null) {
                continue;
            }

            $seller = User::factory()->create([
                'display_name' => $index % 3 === 0 ? 'Auto '.$city->name : 'Seller '.($index + 1),
                'seller_type' => $index % 3 === 0 ? SellerType::Dealer : SellerType::Private,
                'dealer_name' => $index % 3 === 0 ? 'Auto '.$city->name : null,
                'country_code' => $city->country_code,
                'city_id' => $city->getKey(),
            ]);

            $listing = $listings->createDraft($seller, [
                'vehicle_type' => $type,
                'make_id' => $make->getKey(),
                'model_id' => $model->getKey(),
                'variant' => $car['variant'],
                'year' => $car['year'],
                'mileage_km' => $car['km'],
                'fuel' => $car['fuel'],
                'transmission' => $car['gearbox'],
                'power_hp' => $car['hp'],
                'body_type' => $car['body'],
                // Doors and seats mean nothing on two wheels, and a drivetrain
                // means something different enough not to claim either.
                'drivetrain' => $type === VehicleType::Motorcycle ? null : 'fwd',
                'color' => 'grey',
                'doors' => $type === VehicleType::Motorcycle ? null : 5,
                'seats' => $type === VehicleType::Motorcycle ? null : 5,
                'price_eur' => $car['price'],
                'price_negotiable' => $index % 2 === 0,
                'customs_cleared' => true,
                'description' => $type === VehicleType::Motorcycle
                    ? 'One owner from new, full service history, garaged. New tyres and chain fitted this year.'
                    : 'Full service history, two owners, no accidents. Recently serviced with new tyres and brakes.',
                'features' => $type === VehicleType::Motorcycle
                    ? ['abs', 'led_lights', 'service_history', 'first_owner']
                    : ['air_conditioning', 'parking_sensors', 'bluetooth', 'alloy_wheels', 'cruise_control', 'service_history'],
                'country_code' => $city->country_code,
                'city_id' => $city->getKey(),
                'latitude' => $city->latitude,
                'longitude' => $city->longitude,
            ]);

            foreach (range(1, 4) as $position) {
                $photos->store($listing, [$this->photo($car, $position)]);
            }

            $credits->grant($seller, 1, CreditReason::Promo);
            $listing = $listings->publish($listing);

            // Spread the bumps so the results have an order worth looking at.
            $listing->forceFill([
                'bumped_at' => Carbon::now()->subMinutes($index * 7),
                'featured_until' => $index === 0 ? Carbon::now()->addDays(3) : null,
                'view_count' => 40 + ($index * 17),
            ])->save();
        }

        $this->command?->info('Published '.Listing::query()->count().' development listings.');
    }

    /**
     * The car's photograph, or a stand-in panel if nobody has fetched one.
     *
     * `node scripts/fetch-car-photos.js` pulls freely licensed photographs of
     * these eight cars into storage/app/dev-photos, with the photographer and
     * the licence recorded beside them. They are development photographs: in
     * production a listing's pictures are the seller's own. Without them this
     * falls back to a coloured panel, so a fresh checkout still seeds.
     *
     * @param  array<string, mixed>  $car
     */
    private function photo(array $car, int $position): UploadedFile
    {
        $real = storage_path('app/dev-photos/'.$car['photo'].'.jpg');

        if (is_file($real)) {
            // Copied, because the upload path moves the file it is handed and
            // all four shots on a listing come from this one original.
            $copy = tempnam(sys_get_temp_dir(), 'autevo');
            copy($real, $copy);

            return new UploadedFile($copy, $car['photo'].'.jpg', 'image/jpeg', null, true);
        }

        return $this->panel($car, $position);
    }

    /**
     * A stand-in photograph: the car's colour, its name, and which shot it is.
     *
     * Generated rather than shipped so the repository carries no image files,
     * and pushed through the real upload path so the resize, the thumbnail and
     * the metadata stripping all run.
     *
     * @param  array<string, mixed>  $car
     */
    private function panel(array $car, int $position): UploadedFile
    {
        $width = 2400;
        $height = 1600;

        $image = imagecreatetruecolor($width, $height);
        [$r, $g, $b] = $car['colour'];

        // A soft vertical gradient, so the result reads as a photograph rather
        // than a flat swatch.
        for ($y = 0; $y < $height; $y++) {
            $shade = 1 - ($y / $height) * 0.45;
            $line = imagecolorallocate(
                $image,
                (int) max(0, min(255, $r * $shade)),
                (int) max(0, min(255, $g * $shade)),
                (int) max(0, min(255, $b * $shade)),
            );
            imagefilledrectangle($image, 0, $y, $width, $y, $line);
        }

        $ink = imagecolorallocate($image, ...($r + $g + $b > 420 ? [20, 22, 26] : [245, 246, 248]));
        imagestring($image, 5, 60, $height - 120, strtoupper($car['make'].' '.$car['model']), $ink);
        imagestring($image, 4, 60, $height - 90, 'photo '.$position.' of 4', $ink);

        $path = tempnam(sys_get_temp_dir(), 'Autevo').'.jpg';
        imagejpeg($image, $path, 88);
        imagedestroy($image);

        return new UploadedFile($path, 'car.jpg', 'image/jpeg', null, true);
    }
}
