<?php

declare(strict_types=1);

namespace App\Http\Controllers\Device;

use App\Http\Controllers\Controller;
use App\Http\Requests\Device\StoreDeviceTokenRequest;
use App\Http\Resources\DeviceTokenResource;
use App\Services\DeviceTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class DeviceTokenController extends Controller
{
    public function __construct(private readonly DeviceTokenService $devices) {}

    /**
     * Register this device for push, or refresh it. The app calls this on every
     * launch, so the same token arriving again is normal.
     */
    public function store(StoreDeviceTokenRequest $request): JsonResponse
    {
        $device = $this->devices->register(
            $request->user(),
            $request->token(),
            $request->platform(),
        );

        return DeviceTokenResource::make($device)
            ->response()
            ->setStatusCode($device->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Stop sending to this device, which is what signing out should do.
     */
    public function destroy(StoreDeviceTokenRequest $request): Response
    {
        $this->devices->forget($request->user(), $request->token());

        return response()->noContent();
    }
}
