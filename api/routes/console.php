<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

/*
 * Every scheduled job the marketplace runs.
 *
 * All of them are guarded against overlapping, so a slow run never has a second
 * copy of itself running alongside it.
 */

// Take listings out of the results as soon as their fortnight is up.
Schedule::command('listings:expire')
    ->hourly()
    ->withoutOverlapping();

// Warn sellers whose listings run out within two days.
Schedule::command('listings:notify-expiring')
    ->dailyAt('09:00')
    ->withoutOverlapping();

// Refresh the rates the apps convert euro prices with.
Schedule::command('rates:refresh')
    ->dailyAt('06:00')
    ->withoutOverlapping();

// Tell buyers about new cars matching a search they saved.
Schedule::command('saved-searches:process')
    ->everyFifteenMinutes()
    ->withoutOverlapping();
