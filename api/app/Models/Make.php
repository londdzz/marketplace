<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VehicleType;
use App\Support\TextNormalizer;
use Database\Factories\MakeFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Make extends Model
{
    /** @use HasFactory<MakeFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'name_normalized',
        'logo_path',
        'popular',
        'cars',
        'motorcycles',
    ];

    protected function casts(): array
    {
        return [
            'popular' => 'boolean',
            'cars' => 'boolean',
            'motorcycles' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Make $make): void {
            $make->name_normalized = TextNormalizer::normalize((string) $make->name);
        });
    }

    /**
     * Makes that sell this kind of vehicle. BMW, Honda, Suzuki and Yamaha all
     * answer to both, which is why a make carries a flag per kind rather than
     * a type of its own.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeSelling(Builder $query, VehicleType $type): void
    {
        $query->where($type === VehicleType::Motorcycle ? 'motorcycles' : 'cars', true);
    }

    /** Whether this make sells the given kind of vehicle at all. */
    public function sells(VehicleType $type): bool
    {
        return $type === VehicleType::Motorcycle
            ? (bool) $this->motorcycles
            : (bool) $this->cars;
    }

    /**
     * Whether this make leads the picker for the given kind.
     *
     * Two columns rather than one, because the answer differs: `popular` is the
     * car answer and keeps the meaning it had when every make in the table sold
     * cars and nothing else.
     */
    public function popularFor(VehicleType $type): bool
    {
        return $type === VehicleType::Motorcycle
            ? (bool) $this->popular_motorcycles
            : (bool) $this->popular;
    }

    /**
     * @return HasMany<VehicleModel, $this>
     */
    public function models(): HasMany
    {
        return $this->hasMany(VehicleModel::class);
    }

    /**
     * @return HasMany<Listing, $this>
     */
    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }
}
