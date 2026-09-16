<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
 * The concurrency suite forks real processes, so it cannot run inside the
 * transaction RefreshDatabase opens: the children would not see rows the parent
 * has not committed. It migrates the database for real instead.
 */
pest()->extend(TestCase::class)
    ->use(DatabaseMigrations::class)
    ->in('Concurrency');

/**
 * Forget the resolved authentication guard.
 *
 * A test runs against one application instance, so a guard that has already
 * resolved a user keeps returning it for every later request in the same test.
 * Production hands every request a fresh application, so a test that makes
 * several requests in a row calls this between them to behave the same way.
 */
function asNewRequest(): void
{
    app('auth')->forgetGuards();
}
