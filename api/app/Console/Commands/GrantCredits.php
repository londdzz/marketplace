<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\CreditReason;
use App\Enums\Store;
use App\Models\User;
use App\Services\CreditService;
use Illuminate\Console\Command;

/**
 * Give an account credits by hand.
 *
 * For support: a purchase a store took but never reported, a goodwill credit
 * after a failed listing, a test account. It goes through CreditService like
 * everything else, so the grant is written to the ledger with a balance and a
 * reason, and can be read back.
 */
class GrantCredits extends Command
{
    protected $signature = 'credits:grant {phone : The account phone number, in full international form} {amount : How many credits to add}';

    protected $description = 'Grant credits to one account, recorded in the ledger as an admin grant';

    public function handle(CreditService $credits): int
    {
        $amount = (int) $this->argument('amount');

        if ($amount < 1) {
            $this->error('The amount must be at least 1.');

            return self::FAILURE;
        }

        $user = User::query()->where('phone', $this->argument('phone'))->first();

        if (! $user instanceof User) {
            $this->error('No account has that number.');

            return self::FAILURE;
        }

        $transaction = $credits->grant($user, $amount, CreditReason::AdminGrant, Store::Admin);

        $this->info(sprintf(
            'Granted %d credit(s) to %s. Balance is now %d.',
            $amount,
            (string) $user->phone,
            $transaction->balance_after,
        ));

        return self::SUCCESS;
    }
}
