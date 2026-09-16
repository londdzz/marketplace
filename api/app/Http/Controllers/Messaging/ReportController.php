<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messaging\StoreReportRequest;
use App\Http\Resources\ReportResource;
use App\Models\Listing;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function store(StoreReportRequest $request, Listing $listing): JsonResponse
    {
        $report = $this->reports->file(
            $listing,
            $request->user(),
            $request->reason(),
            $request->note(),
        );

        return ReportResource::make($report)->response()->setStatusCode(201);
    }
}
