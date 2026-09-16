<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->char('country_code', 2);
            $table->string('name');
            $table->string('name_normalized');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedInteger('population')->nullable();

            $table->foreign('country_code')
                ->references('code')
                ->on('countries')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->index('name_normalized');
            $table->index(['country_code', 'name_normalized']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cities');
    }
};
