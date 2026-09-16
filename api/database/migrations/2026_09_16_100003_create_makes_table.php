<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('makes', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('name_normalized');
            $table->boolean('popular')->default(false);

            $table->index('name_normalized');
            $table->index(['popular', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('makes');
    }
};
