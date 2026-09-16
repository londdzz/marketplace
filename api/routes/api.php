<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Listing\ListingController;
use App\Http\Controllers\Listing\ListingPhotoController;
use App\Http\Controllers\Listing\MyListingController;
use App\Http\Controllers\Reference\ReferenceController;
use Illuminate\Support\Facades\Route;

/*
 * Everything here is served under the /api/v1 prefix, configured in
 * bootstrap/app.php.
 *
 * Publishing and credits arrive in phase 4, search in phase 5, and messaging,
 * favorites, saved searches and reports in phase 6.
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

/*
 * Reference data behind the pickers and filters. Public and cached.
 */
Route::get('countries', [ReferenceController::class, 'countries'])->name('countries.index');
Route::get('cities', [ReferenceController::class, 'cities'])->name('cities.index');
Route::get('makes', [ReferenceController::class, 'makes'])->name('makes.index');
Route::get('makes/{make}/models', [ReferenceController::class, 'models'])->name('makes.models');
Route::get('exchange-rates', [ReferenceController::class, 'exchangeRates'])->name('exchange-rates.index');

/*
 * A published listing is public. Everything that changes one needs the seller.
 */
Route::get('listings/{listing}', [ListingController::class, 'show'])->name('listings.show');

Route::middleware(['auth:sanctum', 'blocked'])->group(function (): void {
    Route::get('my/listings', [MyListingController::class, 'index'])->name('my.listings.index');

    Route::post('listings', [ListingController::class, 'store'])->name('listings.store');
    Route::patch('listings/{listing}', [ListingController::class, 'update'])->name('listings.update');
    Route::delete('listings/{listing}', [ListingController::class, 'destroy'])->name('listings.destroy');

    Route::post('listings/{listing}/photos', [ListingPhotoController::class, 'store'])->name('listings.photos.store');
    Route::patch('listings/{listing}/photos/order', [ListingPhotoController::class, 'order'])->name('listings.photos.order');
    Route::delete('listings/{listing}/photos/{photo}', [ListingPhotoController::class, 'destroy'])->name('listings.photos.destroy');
});
