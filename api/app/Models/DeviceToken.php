<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Platform;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceToken extends Model
{
    /** @use HasFactory<\Database\Factories\DeviceTokenFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token',
        'platform',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'platform' => Platform::class,
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
