<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\TextNormalizer;
use Database\Factories\VehicleModelFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A vehicle model, for example "Passat". Backed by the `models` table; the class
 * is named VehicleModel so it does not collide with Eloquent's own Model class.
 */
class VehicleModel extends Model
{
    /** @use HasFactory<VehicleModelFactory> */
    use HasFactory;

    protected $table = 'models';

    public $timestamps = false;

    protected $fillable = [
        'make_id',
        'name',
        'name_normalized',
        'body_type',
    ];

    protected static function booted(): void
    {
        static::saving(function (VehicleModel $model): void {
            $model->name_normalized = TextNormalizer::normalize((string) $model->name);
        });
    }

    /**
     * @return BelongsTo<Make, $this>
     */
    public function make(): BelongsTo
    {
        return $this->belongsTo(Make::class);
    }

    /**
     * @return HasMany<Listing, $this>
     */
    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class, 'model_id');
    }
}
