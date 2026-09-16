<?php

declare(strict_types=1);

namespace App\Http\Controllers\Credit;

use App\Data\CreditBalance;
use App\Http\Controllers\Controller;
use App\Http\Resources\CreditBalanceResource;
use App\Models\CreditTransaction;
use App\Services\CreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditController extends Controller
{
    public function __construct(private readonly CreditService $credits) {}

    /**
     * The balance, the ledger behind it, and the packs on sale.
     */
    public function index(Request $request, CreditService $credits): JsonResponse
    {
        $user = $request->user();

        $history = CreditTransaction::query()
            ->where('user_id', $user->getKey())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        $balance = new CreditBalance(
            balance: $this->credits->balance($user),
            history: $history,
            packs: $this->packs(),
        );

        return CreditBalanceResource::make($balance)->response();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function packs(): array
    {
        $packs = [];

        foreach ((array) config('credits.packs') as $productId => $pack) {
            $packs[] = [
                'product_id' => $productId,
                'credits' => (int) $pack['credits'],
                'price_eur' => (string) $pack['price_eur'],
                'most_popular' => (bool) ($pack['most_popular'] ?? false),
            ];
        }

        return $packs;
    }
}
