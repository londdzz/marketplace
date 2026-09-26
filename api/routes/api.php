<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Credit\CreditController;
use App\Http\Controllers\Device\DeviceTokenController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\Listing\ListingController;
use App\Http\Controllers\Listing\ListingLifecycleController;
use App\Http\Controllers\Listing\ListingPhotoController;
use App\Http\Controllers\Listing\ListingSearchController;
use App\Http\Controllers\Listing\MyListingController;
use App\Http\Controllers\Messaging\BlockController;
use App\Http\Controllers\Messaging\ConversationController;
use App\Http\Controllers\Messaging\FavoriteController;
use App\Http\Controllers\Messaging\ReportController;
use App\Http\Controllers\Messaging\SavedSearchController;
use App\Http\Controllers\Reference\ReferenceController;
use App\Http\Controllers\Webhook\RevenueCatWebhookController;
use Illuminate\Support\Facades\Route;

/*
 * Everything here is served under the /api/v1 prefix, configured in
 * bootstrap/app.php.
 *
 * The scheduled jobs that go with these live in routes/console.php.
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
Route::get('vocabularies', [ReferenceController::class, 'vocabularies'])->name('vocabularies.index');
Route::get('browse', [ReferenceController::class, 'browse'])->name('browse.index');
// Read only on purpose. Nothing anywhere writes a sponsor over HTTP.
Route::get('sponsors', [ReferenceController::class, 'sponsors'])->name('sponsors.index');

/*
 * A published listing is public. Everything that changes one needs the seller.
 */
Route::get('listings', ListingSearchController::class)
    ->middleware('throttle:search')
    ->name('listings.index');
Route::get('listings/{listing}', [ListingController::class, 'show'])->name('listings.show');

Route::middleware(['auth:sanctum', 'blocked'])->group(function (): void {
    Route::post('feedback', [FeedbackController::class, 'store'])->name('feedback.store');

    Route::get('my/listings', [MyListingController::class, 'index'])->name('my.listings.index');

    Route::post('listings', [ListingController::class, 'store'])
        ->middleware('throttle:create-draft')
        ->name('listings.store');
    Route::patch('listings/{listing}', [ListingController::class, 'update'])->name('listings.update');
    Route::delete('listings/{listing}', [ListingController::class, 'destroy'])->name('listings.destroy');

    Route::post('listings/{listing}/publish', [ListingLifecycleController::class, 'publish'])->name('listings.publish');
    Route::post('listings/{listing}/renew', [ListingLifecycleController::class, 'renew'])->name('listings.renew');
    Route::get('listings/{listing}/promotion', [ListingLifecycleController::class, 'promotionOptions'])->name('listings.promotion');
    Route::post('listings/{listing}/promote', [ListingLifecycleController::class, 'promote'])->name('listings.promote');
    Route::post('listings/{listing}/mark-sold', [ListingLifecycleController::class, 'markSold'])->name('listings.mark-sold');

    Route::get('credits', [CreditController::class, 'index'])->name('credits.index');

    Route::post('device-tokens', [DeviceTokenController::class, 'store'])->name('device-tokens.store');
    Route::delete('device-tokens', [DeviceTokenController::class, 'destroy'])->name('device-tokens.destroy');

    Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
    Route::get('conversations/{conversation}/messages', [ConversationController::class, 'messages'])->name('conversations.messages');
    Route::post('conversations/{conversation}/messages', [ConversationController::class, 'send'])
        ->middleware('throttle:send-message')
        ->name('conversations.send');
    Route::post('conversations/{conversation}/read', [ConversationController::class, 'read'])->name('conversations.read');

    Route::post('listings/{listing}/conversations', [ConversationController::class, 'store'])
        ->middleware('throttle:start-conversation')
        ->name('listings.conversations.store');

    // Blocking someone hides them both ways. Required by both stores of any
    // app where strangers can message each other.
    Route::get('blocks', [BlockController::class, 'index'])->name('blocks.index');
    Route::post('blocks', [BlockController::class, 'store'])->name('blocks.store');
    Route::delete('blocks/{user}', [BlockController::class, 'destroy'])->name('blocks.destroy');

    Route::get('favorites', [FavoriteController::class, 'index'])->name('favorites.index');
    Route::post('favorites', [FavoriteController::class, 'store'])->name('favorites.store');
    Route::delete('favorites/{listing}', [FavoriteController::class, 'destroy'])->name('favorites.destroy');

    Route::get('saved-searches', [SavedSearchController::class, 'index'])->name('saved-searches.index');
    Route::post('saved-searches', [SavedSearchController::class, 'store'])->name('saved-searches.store');
    Route::delete('saved-searches/{savedSearch}', [SavedSearchController::class, 'destroy'])->name('saved-searches.destroy');

    Route::post('listings/{listing}/report', [ReportController::class, 'store'])
        ->middleware('throttle:report-listing')
        ->name('listings.report');

    Route::post('listings/{listing}/photos', [ListingPhotoController::class, 'store'])
        ->middleware('throttle:upload-photos')
        ->name('listings.photos.store');
    Route::patch('listings/{listing}/photos/order', [ListingPhotoController::class, 'order'])->name('listings.photos.order');
    Route::delete('listings/{listing}/photos/{photo}', [ListingPhotoController::class, 'destroy'])->name('listings.photos.destroy');
});

/*
 * The store tells us about purchases, never the app. No authentication
 * middleware: the shared secret in the Authorization header is what proves the
 * caller, and the grant is idempotent because webhooks retry.
 */
Route::post('webhooks/revenuecat', RevenueCatWebhookController::class)
    ->middleware('revenuecat')
    // Exempt from the global throttle on purpose. A dropped delivery is a
    // purchase that granted nothing until RevenueCat retries, and the shared
    // secret already means only RevenueCat can reach the handler at all — a
    // caller without it never gets past the middleware above.
    ->withoutMiddleware('throttle:api')
    ->name('webhooks.revenuecat');
