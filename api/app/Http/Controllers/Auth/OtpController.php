<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Data\AuthSession;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RequestOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Resources\AuthSessionResource;
use App\Http\Resources\OtpChallengeResource;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;

class OtpController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    /**
     * Send a one-time code to a phone number.
     */
    public function request(RequestOtpRequest $request): JsonResponse
    {
        $challenge = $this->otp->request($request->phone(), $request->locale());

        return OtpChallengeResource::make($challenge)
            ->response()
            ->setStatusCode(202);
    }

    /**
     * Exchange a valid code for an API token, opening an account if the number
     * has never signed in before.
     */
    public function verify(VerifyOtpRequest $request): JsonResponse
    {
        $user = $this->otp->verify(
            $request->phone(),
            $request->code(),
            $request->countryCode(),
            $request->locale(),
        );

        $token = $user->createToken($request->deviceName())->plainTextToken;

        return AuthSessionResource::make(new AuthSession($user->loadMissing('city'), $token))
            ->response()
            ->setStatusCode($user->wasRecentlyCreated ? 201 : 200);
    }
}
