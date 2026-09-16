<?php

declare(strict_types=1);

use App\Enums\CreditReason;
use App\Enums\Store;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // Positive on a purchase or grant, negative on a spend.
            $table->integer('delta');
            $table->enum('reason', CreditReason::values());
            $table->foreignUuid('listing_id')->nullable()->constrained('listings')->nullOnDelete();
            $table->enum('store', Store::values())->nullable();

            // The idempotency key for store purchases: a webhook that arrives
            // twice must grant only once.
            $table->string('store_transaction_id')->nullable()->unique();
            $table->decimal('price_paid_eur', 10, 2)->nullable();

            // The resulting balance, written on every single change.
            $table->integer('balance_after');
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_transactions');
    }
};
