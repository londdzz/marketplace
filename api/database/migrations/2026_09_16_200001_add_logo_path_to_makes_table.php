<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Where a make's logo lives on the storage disk.
     *
     * Marketplaces identify the car being sold by its maker's mark, so the
     * pickers and the results want them. The column is nullable and the apps
     * fall back to a monogram, which means logos can be added a few at a time
     * rather than all forty at once.
     */
    public function up(): void
    {
        Schema::table('makes', function (Blueprint $table) {
            $table->string('logo_path')->nullable()->after('name_normalized');
        });
    }

    public function down(): void
    {
        Schema::table('makes', function (Blueprint $table) {
            $table->dropColumn('logo_path');
        });
    }
};
