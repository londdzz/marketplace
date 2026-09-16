<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\TextNormalizer;
use Database\Factories\MakeFactory;
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
        'popular',
    ];

    protected function casts(): array
    {
        return [
            'popular' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Make $make): void {
            $make->name_normalized = TextNormalizer::normalize((string) $make->name);
        });
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
