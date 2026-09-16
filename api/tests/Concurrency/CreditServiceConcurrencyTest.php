<?php

declare(strict_types=1);

use App\Enums\CreditReason;
use App\Enums\Store;
use App\Models\CreditTransaction;
use App\Models\User;
use App\Services\CreditService;
use Illuminate\Support\Facades\DB;

/**
 * Real processes, not simulated ones: lockForUpdate only proves anything when
 * several connections genuinely race for the same user row.
 */
it('cannot be driven negative by concurrent spends', function (): void {
    $service = app(CreditService::class);

    $user = User::factory()->create();
    $service->grant($user, 3, CreditReason::Purchase, Store::Apple, 'apple-tx-concurrency', '4.50');

    $workers = 10;
    $granted = 3;

    $resultDir = sys_get_temp_dir().'/credit-race-'.bin2hex(random_bytes(6));
    mkdir($resultDir);

    // Every worker starts at the same instant, so the spends really do overlap.
    $startAt = microtime(true) + 0.5;
    $pids = [];

    for ($worker = 0; $worker < $workers; $worker++) {
        $pid = pcntl_fork();

        if ($pid === -1) {
            $this->fail('Could not fork a worker process.');
        }

        if ($pid === 0) {
            // Child. Never reuse the parent's database connection.
            DB::purge();

            $outcome = 'refused';

            try {
                $wait = (int) round(($startAt - microtime(true)) * 1_000_000);

                if ($wait > 0) {
                    usleep($wait);
                }

                app(CreditService::class)->spend($user, 1, CreditReason::ListingPublish);
                $outcome = 'spent';
            } catch (Throwable $e) {
                $outcome = 'refused: '.$e::class;
            }

            file_put_contents($resultDir.'/'.getmypid(), $outcome);

            // Leave at once: the test runner must never resume inside a child.
            posix_kill(getmypid(), SIGKILL);
        }

        $pids[] = $pid;
    }

    foreach ($pids as $pid) {
        pcntl_waitpid($pid, $status);
    }

    $outcomes = array_map(
        static fn (string $file): string => (string) file_get_contents($file),
        glob($resultDir.'/*') ?: [],
    );

    array_map('unlink', glob($resultDir.'/*') ?: []);
    rmdir($resultDir);

    $spent = count(array_filter($outcomes, static fn (string $outcome): bool => $outcome === 'spent'));

    expect($outcomes)->toHaveCount($workers)
        ->and($spent)->toBe($granted)
        ->and($service->balance($user))->toBe(0);

    $spendRows = CreditTransaction::query()
        ->where('user_id', $user->getKey())
        ->where('delta', '<', 0)
        ->get();

    expect($spendRows)->toHaveCount($granted)
        ->and($spendRows->pluck('balance_after')->sort()->values()->all())->toBe([0, 1, 2]);

    $lowest = CreditTransaction::query()
        ->where('user_id', $user->getKey())
        ->min('balance_after');

    expect((int) $lowest)->toBe(0);
})->skip(
    ! function_exists('pcntl_fork') || ! function_exists('posix_kill'),
    'The pcntl and posix extensions are required to fork real workers.',
);
