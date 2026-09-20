<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\FeedbackRequest;
use App\Models\AppFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * The one question the home screen asks.
 *
 * Answering twice changes the answer rather than adding a second one, so the
 * distribution is one row per person and nobody can lean on it.
 */
class FeedbackController extends Controller
{
    public function store(FeedbackRequest $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $user): void {
            AppFeedback::query()->updateOrCreate(
                ['user_id' => $user->getKey()],
                ['score' => $request->score(), 'note' => $request->note()],
            );

            $user->forceFill(['rated_at' => now()])->save();
        });

        return response()->json(['data' => ['rated_at' => $user->rated_at?->toIso8601String()]], 201);
    }
}
