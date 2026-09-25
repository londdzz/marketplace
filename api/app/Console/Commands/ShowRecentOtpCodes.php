<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Support\PhoneNumber;
use Illuminate\Console\Command;

/**
 * Read back the codes the log driver wrote, so one can be relayed to whoever
 * is waiting for it.
 *
 * This exists for the friends-and-family stage, where `OTP_DRIVER=log` sends
 * nothing and somebody has to pass the code along by hand. It cannot be done
 * from the database: `otp_codes` stores a hash and never the code itself,
 * which is the whole point of that column, so the log is the only place the
 * code has ever existed in the clear.
 *
 * It follows that this command is exactly as sensitive as the log file. It
 * reads what is already on disk and grants nothing new — anyone who can run
 * it can already read the file — but a code on screen is a sign-in, so treat
 * the output the way you would treat the file.
 *
 * The log masks the number (`+389*****001`), so a number given here is masked
 * the same way before matching. Two numbers sharing their first and last three
 * digits therefore both match, which is what the timestamps are for.
 */
class ShowRecentOtpCodes extends Command
{
    protected $signature = 'otp:recent {phone? : Only codes for this number} {--limit=10}';

    protected $description = 'Show the sign-in codes the log driver has written';

    public function handle(): int
    {
        if (config('otp.driver') !== 'log') {
            $this->error('OTP_DRIVER is ['.config('otp.driver').'], so codes are sent rather than logged.');
            $this->line('This command only has anything to read while the driver is [log].');

            return self::FAILURE;
        }

        $path = storage_path('logs/laravel.log');

        if (! is_readable($path)) {
            $this->error("No log file at {$path}.");

            return self::FAILURE;
        }

        $phone = $this->argument('phone');
        $wanted = is_string($phone) && $phone !== ''
            ? PhoneNumber::mask(PhoneNumber::normalize($phone) ?? $phone)
            : null;

        $limit = max(1, (int) $this->option('limit'));
        $rows = [];

        foreach ($this->lines($path) as $line) {
            if (! str_contains($line, 'OTP code generated')) {
                continue;
            }

            preg_match('/^\[([^\]]+)\]/', $line, $when);
            preg_match('/"phone":"([^"]+)"/', $line, $number);
            preg_match('/"code":"(\d+)"/', $line, $code);

            if ($code === [] || $number === []) {
                continue;
            }

            if ($wanted !== null && $number[1] !== $wanted) {
                continue;
            }

            $rows[] = [$when[1] ?? '?', $number[1], $code[1]];

            if (count($rows) >= $limit) {
                break;
            }
        }

        if ($rows === []) {
            $this->warn($wanted === null
                ? 'No codes in the log yet. Ask for one from the app first.'
                : "No codes in the log for {$wanted}.");

            return self::SUCCESS;
        }

        // Oldest first, so the newest — the one somebody is waiting for — is
        // the last line on screen rather than the first.
        $this->table(['When (UTC)', 'Number', 'Code'], array_reverse($rows));

        return self::SUCCESS;
    }

    /**
     * The log file backwards, a line at a time.
     *
     * Backwards because the code somebody is waiting for is the last one
     * written, and a log that has been running for weeks is not worth reading
     * from the top to find it. A chunk at a time rather than file() for the
     * same reason: the file is megabytes and the answer is in its last few
     * kilobytes.
     *
     * @return iterable<string>
     */
    private function lines(string $path): iterable
    {
        $handle = fopen($path, 'r');

        if ($handle === false) {
            return;
        }

        $size = (int) filesize($path);
        $chunk = 8192;
        $at = $size;
        $rest = '';

        while ($at > 0) {
            $read = (int) min($chunk, $at);
            $at -= $read;

            fseek($handle, $at);
            $buffer = (string) fread($handle, $read);
            $pieces = explode("\n", $buffer.$rest);
            $rest = array_shift($pieces) ?? '';

            foreach (array_reverse($pieces) as $line) {
                yield $line;
            }
        }

        if ($rest !== '') {
            yield $rest;
        }

        fclose($handle);
    }
}
