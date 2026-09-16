<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CreditReason;
use App\Enums\Store;
use Database\Factories\CreditTransactionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The append-only ledger behind users.credits. Every single change to a balance
 * writes one row here, including the resulting balance_after.
 */
class CreditTransaction extends Model
{
    /** @use HasFactory<CreditTransactionFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'delta',
        'reason',
        'listing_id',
        'store',
        'store_transaction_id',
        'price_paid_eur',
        'balance_after',
    ];

    protected function casts(): array
    {
        return [
            'delta' => 'integer',
            'reason' => CreditReason::class,
            'store' => Store::class,
            'price_paid_eur' => 'decimal:2',
            'balance_after' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Listing, $this>
     */
    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }
}
