<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_searches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->json('filters');
            $table->boolean('notify')->default(true);
            $table->timestamp('last_notified_at')->nullable();
            $table->timestamps();

            $table->index(['notify', 'last_notified_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_searches');
    }
};
