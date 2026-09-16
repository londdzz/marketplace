<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\TextNormalizer;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    /** @use HasFactory<\Database\Factories\CityFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'country_code',
        'name',
        'name_normalized',
        'latitude',
        'longitude',
        'population',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'population' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (City $city): void {
            $city->name_normalized = TextNormalizer::normalize((string) $city->name);
        });
    }

    /**
     * @return BelongsTo<Country, $this>
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'country_code', 'code');
    }

    /**
     * @return HasMany<Listing, $this>
     */
    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }
}
