<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Sponsor;
use App\Services\SponsorService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Take a sponsor down.
 *
 * Switched off by default rather than deleted, because a booking that ends is
 * a thing you may want to look up later and because the artwork is what you
 * would have to ask the sponsor for again. `--purge` is the one that really
 * removes it, picture and all.
 */
class RemoveSponsor extends Command
{
    protected $signature = 'sponsors:remove {id} {--purge : Delete the row and the artwork rather than switching it off}';

    protected $description = 'Take a sponsor off the home screen';

    public function handle(): int
    {
        $sponsor = Sponsor::query()->find($this->argument('id'));

        if (! $sponsor instanceof Sponsor) {
            $this->error('No sponsor with that number. `sponsors:list --all` shows them.');

            return self::FAILURE;
        }

        if ($this->option('purge')) {
            Storage::disk((string) config('filesystems.default'))->delete($sponsor->image_path);
            $sponsor->delete();
            $this->info("Deleted #{$this->argument('id')} — {$sponsor->name}, and its artwork.");
        } else {
            $sponsor->forceFill(['active' => false])->save();
            $this->info("Switched off #{$sponsor->id} — {$sponsor->name}. The row and the artwork are still here.");
        }

        SponsorService::forget();

        return self::SUCCESS;
    }
}
