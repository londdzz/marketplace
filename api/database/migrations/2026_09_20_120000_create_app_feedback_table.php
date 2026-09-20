<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What people think of the app, asked once on the home screen.
 *
 * One row per account, so the question is asked once and the answer can be
 * changed rather than counted twice. `users.rated_at` carries the same fact so
 * the home screen knows not to ask again without a second query on every
 * launch.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_feedback', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('score');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            // Read as a distribution far more often than a single row.
            $table->index('score');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('rated_at')->nullable()->after('blocked_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('rated_at');
        });

        Schema::dropIfExists('app_feedback');
    }
};
