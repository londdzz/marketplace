<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What kind of vehicle a listing is.
 *
 * One table holds both. A motorcycle shares almost everything a car has —
 * make, model, year, kilometres, fuel, price, town, photographs — and the
 * handful of columns that differ (doors and seats mean nothing on a bike;
 * engine_cc means far more) are already nullable. Two tables would have meant
 * two of every policy, every resource and every search.
 */
enum VehicleType: string
{
    case Car = 'car';
    case Motorcycle = 'motorcycle';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** The closed vocabulary of shapes this kind of vehicle comes in. */
    public function bodyTypes(): array
    {
        return match ($this) {
            self::Car => (array) config('listings.body_types'),
            self::Motorcycle => (array) config('listings.motorcycle_types'),
        };
    }

    public function label(): string
    {
        return 'listing.vehicle_type.'.$this->value;
    }
}
