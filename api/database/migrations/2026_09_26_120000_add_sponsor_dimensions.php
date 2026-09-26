<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The stored size of a sponsor's artwork.
 *
 * So a partner row can normalise on height rather than on width. Given an
 * equal share of the row each, a short mark scales up to fill it and ends up
 * twice the size of the long one beside it — which is what a partner row that
 * looks unprofessional actually is. Knowing the proportions lets every mark
 * be drawn to the same height and take the width it needs.
 *
 * Nullable, because a row added before this migration has no measurement and
 * the apps fall back to an equal share for it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sponsors', function (Blueprint $table): void {
            $table->unsignedInteger('width')->nullable()->after('alt');
            $table->unsignedInteger('height')->nullable()->after('width');
        });
    }

    public function down(): void
    {
        Schema::table('sponsors', function (Blueprint $table): void {
            $table->dropColumn(['width', 'height']);
        });
    }
};
