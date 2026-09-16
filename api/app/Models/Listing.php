<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\FuelType;
use App\Enums\ListingStatus;
use App\Enums\Transmission;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Listing extends Model
{
    /** @use HasFactory<\Database\Factories\ListingFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * `status` is deliberately absent: a client can never set it. A listing
     * only becomes active through ListingService::publish(), which spends a
     * credit. `search_text` is derived, never submitted.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'make_id',
        'model_id',
        'variant',
        'year',
        'mileage_km',
        'fuel',
        'transmission',
        'body_type',
        'engine_cc',
        'power_hp',
        'drivetrain',
        'color',
        'doors',
        'seats',
        'price_eur',
        'price_negotiable',
        'vat_deductible',
        'customs_cleared',
        'description',
        'features',
        'country_code',
        'city_id',
        'latitude',
        'longitude',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ListingStatus::class,
            'fuel' => FuelType::class,
            'transmission' => Transmission::class,
            'year' => 'integer',
            'mileage_km' => 'integer',
            'engine_cc' => 'integer',
            'power_hp' => 'integer',
            'doors' => 'integer',
            'seats' => 'integer',
            'price_eur' => 'decimal:2',
            'price_negotiable' => 'boolean',
            'vat_deductible' => 'boolean',
            'customs_cleared' => 'boolean',
            'features' => 'array',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'view_count' => 'integer',
            'contact_count' => 'integer',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'bumped_at' => 'datetime',
            'featured_until' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === ListingStatus::Active;
    }

    public function isFeatured(): bool
    {
        return $this->featured_until !== null && $this->featured_until->isFuture();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Make, $this>
     */
    public function make(): BelongsTo
    {
        return $this->belongsTo(Make::class);
    }

    /**
     * @return BelongsTo<VehicleModel, $this>
     */
    public function model(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class, 'model_id');
    }

    /**
     * @return BelongsTo<Country, $this>
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'country_code', 'code');
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * @return HasMany<ListingPhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(ListingPhoto::class)->orderBy('position');
    }

    /**
     * @return HasMany<Conversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /**
     * @return HasMany<Favorite, $this>
     */
    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    /**
     * @return HasMany<Report, $this>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }
}
