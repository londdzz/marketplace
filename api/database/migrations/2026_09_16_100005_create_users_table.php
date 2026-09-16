<?php

declare(strict_types=1);

use App\Enums\SellerType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('display_name')->nullable();
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();

            // Authentication is phone + OTP, so a password is never required.
            $table->string('password')->nullable();

            $table->string('phone', 32)->nullable()->unique();
            $table->timestamp('phone_verified_at')->nullable();
            $table->char('country_code', 2);
            $table->foreignId('city_id')->nullable()->constrained('cities')->nullOnDelete();
            $table->string('preferred_language', 5)->default('sq');
            $table->enum('seller_type', SellerType::values())->default(SellerType::Private->value);
            $table->string('dealer_name')->nullable();
            $table->unsignedInteger('credits')->default(0);
            $table->timestamp('blocked_at')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->foreign('country_code')
                ->references('code')
                ->on('countries')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
