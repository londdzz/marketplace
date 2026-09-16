<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ReportReason;
use App\Models\Listing;
use App\Models\Report;
use App\Models\User;

final class ReportService
{
    /**
     * File a report, or update the one this person already has open against
     * this listing. Reporting twice does not stack.
     */
    public function file(Listing $listing, User $reporter, ReportReason $reason, ?string $note = null): Report
    {
        $report = Report::query()
            ->where('listing_id', $listing->getKey())
            ->where('reporter_id', $reporter->getKey())
            ->whereNull('resolved_at')
            ->first();

        if ($report instanceof Report) {
            $report->forceFill(['reason' => $reason, 'note' => $note])->save();

            return $report;
        }

        return Report::query()->create([
            'listing_id' => $listing->getKey(),
            'reporter_id' => $reporter->getKey(),
            'reason' => $reason,
            'note' => $note,
        ]);
    }
}
