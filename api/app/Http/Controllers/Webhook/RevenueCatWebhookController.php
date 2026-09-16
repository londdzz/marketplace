<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Http\Requests\Webhook\RevenueCatWebhookRequest;
use App\Services\PurchaseService;
use Illuminate\Http\JsonResponse;

/**
 * RevenueCat tells us about purchases; the app is never believed about them.
 *
 * Only this endpoint grants credits. The app refetches its balance afterwards.
 */
class RevenueCatWebhookController extends Controller
{
    public function __construct(private readonly PurchaseService $purchases) {}

    public function __invoke(RevenueCatWebhookRequest $request): JsonResponse
    {
        $transaction = $this->purchases->handle($request->event());

        // Always 200: a retry of a delivery already handled must look like a
        // success, and an event we will never act on must not be retried
        // forever.
        return response()->json([
            'granted' => $transaction !== null,
        ]);
    }
}
