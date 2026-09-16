<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listing_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('listing_id')->constrained('listings')->cascadeOnDelete();
            $table->string('path');
            $table->string('thumb_path');
            $table->unsignedTinyInteger('position')->default(0);
            $table->unsignedSmallInteger('width');
            $table->unsignedSmallInteger('height');
            $table->timestamps();

            $table->index(['listing_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_photos');
    }
};
