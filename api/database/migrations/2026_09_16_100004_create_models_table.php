<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('make_id')->constrained('makes')->cascadeOnDelete();
            $table->string('name');
            $table->string('name_normalized');
            $table->string('body_type', 32)->nullable();

            $table->unique(['make_id', 'name']);
            $table->index('name_normalized');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('models');
    }
};
