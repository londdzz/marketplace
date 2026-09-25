<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\OtpSender;
use App\Support\PhoneNumber;
use Illuminate\Console\Command;
use Throwable;

/**
 * Send a sample code through whichever driver is configured.
 *
 * So a webhook URL, a Messaggio login or a WhatsApp template can be proved
 * before somebody is standing there waiting on a code that never arrives.
 * Getting that wrong is otherwise only discovered by a person failing to sign
 * in, which is the worst moment to learn it.
 *
 * **The code it sends is made up and verifies nothing.** No `otp_codes` row is
 * written, so what lands is a message and not a way in.
 */
class PingOtpSender extends Command
{
    protected $signature = 'otp:ping {phone : The number to address the message to} {--locale=mk}';

    protected $description = 'Send a sample code through the configured OTP driver';

    public function handle(OtpSender $sender): int
    {
        $phone = PhoneNumber::normalize((string) $this->argument('phone'));

        if ($phone === null) {
            $this->error('That is not a number this would accept at sign-in.');

            return self::FAILURE;
        }

        $driver = (string) config('otp.driver');

        if ($driver === 'log') {
            $this->warn('The driver is [log], so this goes to storage/logs/laravel.log and nowhere else.');
        }

        // Recognisable on sight as not a real code, and still the right shape,
        // so a template that only accepts six digits is exercised properly.
        $code = str_pad('0', (int) config('otp.length'), '0');

        try {
            $sender->send($phone, $code, (string) $this->option('locale'));
        } catch (Throwable $e) {
            $this->error("The [{$driver}] driver refused it: ".$e->getMessage());
            $this->line('The log will say why — it is written before the exception is thrown.');

            return self::FAILURE;
        }

        $this->info("Sent a sample code to {$phone} through the [{$driver}] driver.");
        $this->line('Nothing was stored, so that code signs nobody in.');

        return self::SUCCESS;
    }
}
