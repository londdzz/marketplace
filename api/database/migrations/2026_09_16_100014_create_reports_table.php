<?php

declare(strict_types=1);

use App\Enums\ReportReason;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('listing_id')->constrained('listings')->cascadeOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->enum('reason', ReportReason::values());
            $table->text('note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['listing_id', 'resolved_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
