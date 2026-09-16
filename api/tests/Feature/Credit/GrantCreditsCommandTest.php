<?php

declare(strict_types=1);

use App\Models\CreditTransaction;
use App\Models\User;

it('grants credits to an account and writes them to the ledger', function (): void {
    $user = User::factory()->create(['phone' => '+38344123456', 'credits' => 2]);

    $this->artisan('credits:grant', ['phone' => '+38344123456', 'amount' => 3])
        ->assertSuccessful();

    expect($user->refresh()->credits)->toBe(5);

    $transaction = CreditTransaction::query()->where('user_id', $user->getKey())->latest('id')->first();

    expect($transaction->delta)->toBe(3)
        ->and($transaction->reason->value)->toBe('admin_grant')
        ->and($transaction->balance_after)->toBe(5);
});

it('refuses a number no account has', function (): void {
    $this->artisan('credits:grant', ['phone' => '+38344000000', 'amount' => 1])
        ->assertFailed();

    expect(CreditTransaction::query()->count())->toBe(0);
});

it('refuses an amount that is not positive', function (): void {
    User::factory()->create(['phone' => '+38344123456']);

    $this->artisan('credits:grant', ['phone' => '+38344123456', 'amount' => 0])
        ->assertFailed();
});
