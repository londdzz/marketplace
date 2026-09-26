<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SponsorSlot;
use App\Enums\VehicleType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * One booked advertisement.
 *
 * @property int $id
 * @property string $name
 * @property SponsorSlot $slot
 * @property string $image_path
 * @property string $alt
 * @property int|null $width
 * @property int|null $height
 * @property string|null $link_url
 * @property VehicleType|null $vehicle_type
 * @property int $position
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property bool $active
 */
class Sponsor extends Model
{
    protected $fillable = [
        'name',
        'slot',
        'image_path',
        'alt',
        'width',
        'height',
        'link_url',
        'vehicle_type',
        'position',
        'starts_at',
        'ends_at',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'slot' => SponsorSlot::class,
            'vehicle_type' => VehicleType::class,
            'width' => 'integer',
            'height' => 'integer',
            'position' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    /**
     * The ones that should be on screen now.
     *
     * Switched on, and inside its dates where it has any. Both ends are open
     * on their own: a booking with a start and no end runs until somebody
     * stops it, which is what an open-ended sponsorship is.
     */
    public function scopeLive(Builder $query): void
    {
        $now = Carbon::now();

        $query->where('active', true)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', $now));
    }

    /**
     * Those that belong beside this catalogue.
     *
     * A sponsor with no vehicle type shows to everybody, which is the default
     * and what most bookings are.
     */
    public function scopeFor(Builder $query, VehicleType $type): void
    {
        $query->where(fn (Builder $q) => $q->whereNull('vehicle_type')->orWhere('vehicle_type', $type));
    }
}
