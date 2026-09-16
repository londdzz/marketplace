<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * A listing was sent to be published before it had everything a buyer needs.
 *
 * The response names the fields that are still missing, so the app can send the
 * seller back to the right step instead of making them hunt.
 */
final class ListingNotReadyException extends HttpException
{
    /**
     * @param  array<int, string>  $missing
     */
    public function __construct(public readonly array $missing)
    {
        parent::__construct(422, (string) __('listing.publish.not_ready'));
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'missing' => $this->missing,
        ], 422);
    }
}
