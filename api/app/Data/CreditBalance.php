<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\CreditTransaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * A balance together with the ledger rows behind it and the packs on sale.
 */
final readonly class CreditBalance
{
    /**
     * @param  LengthAwarePaginator<int, CreditTransaction>  $history
     * @param  array<int, array<string, mixed>>  $packs
     */
    public function __construct(
        public int $balance,
        public LengthAwarePaginator $history,
        public array $packs,
    ) {}
}
