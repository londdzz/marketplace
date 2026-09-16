<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Auth\SessionController;
use Illuminate\Support\Facades\Route;

/*
 * Everything here is served under the /api/v1 prefix, configured in
 * bootstrap/app.php.
 *
 * Listings and photos arrive in phase 3, publishing and credits in phase 4,
 * search in phase 5, and messaging, favorites, saved searches and reports in
 * phase 6.
 */

Route::prefix('auth')->group(function (): void {
    Route::post('otp/request', [OtpController::class, 'request'])
        ->middleware('throttle:otp-request')
        ->name('auth.otp.request');

    Route::post('otp/verify', [OtpController::class, 'verify'])
        ->middleware('throttle:otp-verify')
        ->name('auth.otp.verify');

    Route::post('logout', [SessionController::class, 'destroy'])
        ->middleware('auth:sanctum')
        ->name('auth.logout');
});

Route::middleware(['auth:sanctum', 'blocked'])->group(function (): void {
    Route::get('me', [ProfileController::class, 'show'])->name('me.show');
    Route::patch('me', [ProfileController::class, 'update'])->name('me.update');
    Route::delete('me', [ProfileController::class, 'destroy'])->name('me.destroy');
});
