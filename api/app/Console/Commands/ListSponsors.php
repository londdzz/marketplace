<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Sponsor;
use Illuminate\Console\Command;

/**
 * What is booked, and what is actually on screen.
 *
 * The two are not the same thing — a booking can be switched off, or waiting
 * for its start date, or finished — and "Live" is the column that says which,
 * so nobody has to work it out from two timestamps.
 */
class ListSponsors extends Command
{
    protected $signature = 'sponsors:list {--all : Include the ones that have finished}';

    protected $description = 'Show the booked sponsors';

    public function handle(): int
    {
        $query = Sponsor::query()->orderBy('slot')->orderBy('position')->orderBy('id');

        if (! $this->option('all')) {
            $query->where('active', true);
        }

        $sponsors = $query->get();

        if ($sponsors->isEmpty()) {
            $this->warn($this->option('all') ? 'Nothing has ever been booked.' : 'Nothing booked. Try --all.');

            return self::SUCCESS;
        }

        $this->table(
            ['#', 'Slot', 'Name', 'Live', 'From', 'Until', 'Kind', 'Pos'],
            $sponsors->map(fn (Sponsor $s): array => [
                $s->id,
                $s->slot->value,
                $s->name,
                $this->live($s) ? 'yes' : 'no',
                $s->starts_at?->toDateString() ?? '—',
                $s->ends_at?->toDateString() ?? '—',
                $s->vehicle_type?->value ?? 'both',
                $s->position,
            ])->all(),
        );

        return self::SUCCESS;
    }

    private function live(Sponsor $sponsor): bool
    {
        return Sponsor::query()->live()->whereKey($sponsor->getKey())->exists();
    }
}
