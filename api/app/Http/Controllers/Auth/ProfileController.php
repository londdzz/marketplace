<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\StatusResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AccountDeletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return UserResource::make($user->loadMissing('city'))->response();
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('update', $user);

        $user->fill($request->safe()->only([
            'display_name',
            'preferred_language',
            'country_code',
            'city_id',
            'seller_type',
            'dealer_name',
        ]))->save();

        return UserResource::make($user->fresh()->loadMissing('city'))->response();
    }

    /**
     * Delete the account and everything attached to it, for good.
     */
    public function destroy(Request $request, AccountDeletionService $accounts): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorize('delete', $user);

        $accounts->delete($user);

        return StatusResource::make(__('auth.account_deleted'))->response();
    }
}
