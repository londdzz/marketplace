<?php

declare(strict_types=1);

use App\Contracts\OtpSender;
use App\Enums\CreditReason;
use App\Enums\Platform;
use App\Enums\SellerType;
use App\Enums\Store;
use App\Models\City;
use App\Models\Conversation;
use App\Models\CreditTransaction;
use App\Models\DeviceToken;
use App\Models\Favorite;
use App\Models\Listing;
use App\Models\ListingPhoto;
use App\Models\Message;
use App\Models\OtpCode;
use App\Models\SavedSearch;
use App\Models\User;
use App\Services\CreditService;
use Database\Seeders\CitySeeder;
use Database\Seeders\CountrySeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\Support\RecordingOtpSender;

beforeEach(function (): void {
    $this->seed(CountrySeeder::class);
    $this->seed(CitySeeder::class);

    $this->user = User::factory()->create([
        'country_code' => 'XK',
        'display_name' => 'Arben',
    ]);
});

it('returns the signed-in account', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.id', $this->user->id)
        ->assertJsonPath('data.display_name', 'Arben')
        ->assertJsonPath('data.phone', $this->user->phone)
        ->assertJsonPath('data.country_code', 'XK')
        ->assertJsonPath('data.seller_type', SellerType::Private->value)
        ->assertJsonPath('data.credits', 0);
});

it('reports the balance the ledger holds', function (): void {
    app(CreditService::class)->grant($this->user, 8, CreditReason::Purchase, Store::Apple, 'apple-tx-me', '9.99');

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.credits', 8);
});

it('cannot be read without a token', function (): void {
    $this->withHeader('Accept-Language', 'sq')
        ->getJson('/api/v1/me')
        ->assertStatus(401)
        ->assertJsonPath('message', trans('auth.unauthenticated', [], 'sq'));
});

it('shuts a blocked account out of the authenticated endpoints', function (): void {
    $blocked = User::factory()->blocked()->create(['country_code' => 'XK']);

    $this->actingAs($blocked, 'sanctum')
        ->withHeader('Accept-Language', 'sq')
        ->getJson('/api/v1/me')
        ->assertStatus(403)
        ->assertJsonPath('message', trans('auth.blocked', [], 'sq'));
});

it('updates the parts of a profile the owner controls', function (): void {
    $city = City::query()->where('country_code', 'XK')->firstOrFail();

    $this->actingAs($this->user, 'sanctum')
        ->patchJson('/api/v1/me', [
            'display_name' => 'Arben Krasniqi',
            'preferred_language' => 'sq',
            'city_id' => $city->id,
        ])
        ->assertOk()
        ->assertJsonPath('data.display_name', 'Arben Krasniqi')
        ->assertJsonPath('data.city_id', $city->id)
        ->assertJsonPath('data.city.name', $city->name);

    expect($this->user->fresh()->display_name)->toBe('Arben Krasniqi');
});

it('turns a private seller into a dealer', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->patchJson('/api/v1/me', [
            'seller_type' => SellerType::Dealer->value,
            'dealer_name' => 'Auto Prishtina',
        ])
        ->assertOk()
        ->assertJsonPath('data.seller_type', 'dealer')
        ->assertJsonPath('data.dealer_name', 'Auto Prishtina');
});

it('will not make someone a dealer without a dealer name', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->patchJson('/api/v1/me', ['seller_type' => SellerType::Dealer->value])
        ->assertStatus(422)
        ->assertJsonValidationErrors('dealer_name');
});

it('rejects a language the marketplace does not ship in', function (): void {
    $this->actingAs($this->user, 'sanctum')
        ->patchJson('/api/v1/me', ['preferred_language' => 'de'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('preferred_language');
});

it('rejects a city that sits in another country', function (): void {
    $foreign = City::query()->where('country_code', 'BG')->firstOrFail();

    $this->actingAs($this->user, 'sanctum')
        ->patchJson('/api/v1/me', ['city_id' => $foreign->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('city_id');
});

it('accepts a city when the country moves with it', function (): void {
    $foreign = City::query()->where('country_code', 'BG')->firstOrFail();

    $this->actingAs($this->user, 'sanctum')
        ->patchJson('/api/v1/me', ['country_code' => 'BG', 'city_id' => $foreign->id])
        ->assertOk()
        ->assertJsonPath('data.country_code', 'BG')
        ->assertJsonPath('data.city_id', $foreign->id);
});

it('ignores an attempt to change the phone number or the balance', function (): void {
    $originalPhone = $this->user->phone;

    $this->actingAs($this->user, 'sanctum')
        ->patchJson('/api/v1/me', [
            'display_name' => 'Renamed',
            'phone' => '+38344000000',
            'credits' => 500,
        ])
        ->assertOk();

    $fresh = $this->user->fresh();

    expect($fresh->phone)->toBe($originalPhone)
        ->and($fresh->credits)->toBe(0)
        ->and($fresh->display_name)->toBe('Renamed');
});

it('deletes the account and everything attached to it', function (): void {
    Storage::fake(config('filesystems.default'));

    $user = $this->user;
    $other = User::factory()->create(['country_code' => 'XK']);
    $token = $user->createToken('iPhone')->plainTextToken;

    $listing = Listing::factory()->create(['user_id' => $user->id]);
    $soldListing = Listing::factory()->create(['user_id' => $user->id]);
    $soldListing->delete();

    Storage::disk(config('filesystems.default'))->put('listings/photo.jpg', 'x');
    Storage::disk(config('filesystems.default'))->put('listings/photo-thumb.jpg', 'x');

    ListingPhoto::query()->create([
        'listing_id' => $listing->id,
        'path' => 'listings/photo.jpg',
        'thumb_path' => 'listings/photo-thumb.jpg',
        'position' => 0,
        'width' => 1600,
        'height' => 1200,
    ]);

    app(CreditService::class)->grant($user, 1, CreditReason::Promo);

    Favorite::query()->create(['user_id' => $user->id, 'listing_id' => $listing->id]);

    SavedSearch::query()->create([
        'user_id' => $user->id,
        'name' => 'Golf under 5000',
        'filters' => ['q' => 'golf'],
    ]);

    DeviceToken::query()->create([
        'user_id' => $user->id,
        'token' => 'device-token-1',
        'platform' => Platform::Ios,
    ]);

    $conversation = Conversation::query()->create([
        'listing_id' => $listing->id,
        'buyer_id' => $other->id,
        'seller_id' => $user->id,
        'last_message_at' => Carbon::now(),
    ]);

    Message::query()->create([
        'conversation_id' => $conversation->id,
        'sender_id' => $other->id,
        'body' => 'Is it still available?',
    ]);

    OtpCode::query()->create([
        'phone' => $user->phone,
        'code_hash' => 'hashed',
        'expires_at' => Carbon::now()->addMinutes(5),
    ]);

    $this->withToken($token)
        ->withHeader('Accept-Language', 'sq')
        ->deleteJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.message', trans('auth.account_deleted', [], 'sq'));

    expect(User::query()->whereKey($user->id)->exists())->toBeFalse()
        ->and(Listing::withTrashed()->where('user_id', $user->id)->count())->toBe(0)
        ->and(ListingPhoto::query()->count())->toBe(0)
        ->and(CreditTransaction::query()->where('user_id', $user->id)->count())->toBe(0)
        ->and(Favorite::query()->count())->toBe(0)
        ->and(SavedSearch::query()->count())->toBe(0)
        ->and(DeviceToken::query()->count())->toBe(0)
        ->and(Conversation::query()->count())->toBe(0)
        ->and(Message::query()->count())->toBe(0)
        ->and(OtpCode::query()->count())->toBe(0)
        ->and(PersonalAccessToken::query()->count())->toBe(0);

    Storage::disk(config('filesystems.default'))->assertMissing('listings/photo.jpg');
    Storage::disk(config('filesystems.default'))->assertMissing('listings/photo-thumb.jpg');

    // The other account is untouched.
    expect(User::query()->whereKey($other->id)->exists())->toBeTrue();
});

it('leaves the deleted account unable to come back with its old token', function (): void {
    $token = $this->user->createToken('iPhone')->plainTextToken;

    $this->withToken($token)->deleteJson('/api/v1/me')->assertOk();

    asNewRequest();

    $this->withToken($token)->getJson('/api/v1/me')->assertStatus(401);
});

it('lets the same phone number sign up again after deletion', function (): void {
    $phone = $this->user->phone;
    $token = $this->user->createToken('iPhone')->plainTextToken;

    $this->withToken($token)->deleteJson('/api/v1/me')->assertOk();

    asNewRequest();

    expect(User::query()->where('phone', $phone)->exists())->toBeFalse();

    $sender = new RecordingOtpSender;
    $this->app->instance(OtpSender::class, $sender);

    $this->postJson('/api/v1/auth/otp/request', ['phone' => $phone])->assertStatus(202);

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => $phone, 'code' => $sender->lastCode()])
        ->assertStatus(201);
});

it('cannot be deleted without a token', function (): void {
    $this->deleteJson('/api/v1/me')->assertStatus(401);

    expect(User::query()->count())->toBe(1);
});
