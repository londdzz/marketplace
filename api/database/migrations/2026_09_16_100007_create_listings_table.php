<?php

declare(strict_types=1);

use App\Enums\FuelType;
use App\Enums\ListingStatus;
use App\Enums\Transmission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ListingStatus::values())->default(ListingStatus::Draft->value);

            // The sell flow saves a draft after every step, so the vehicle
            // details fill in progressively. They are required at publish time,
            // which ListingService::publish() enforces, not at insert time.
            $table->foreignId('make_id')->nullable()->constrained('makes')->restrictOnDelete();
            $table->foreignId('model_id')->nullable()->constrained('models')->restrictOnDelete();
            $table->string('variant')->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->unsignedInteger('mileage_km')->nullable();
            $table->enum('fuel', FuelType::values())->nullable();
            $table->enum('transmission', Transmission::values())->nullable();
            $table->string('body_type', 32)->nullable();
            $table->unsignedSmallInteger('engine_cc')->nullable();
            $table->unsignedSmallInteger('power_hp')->nullable();
            $table->string('drivetrain', 16)->nullable();
            $table->string('color', 32)->nullable();
            $table->unsignedTinyInteger('doors')->nullable();
            $table->unsignedTinyInteger('seats')->nullable();

            // Prices are stored in EUR only. Local currency is computed at
            // display time from exchange_rates.
            $table->decimal('price_eur', 10, 2)->nullable();
            $table->boolean('price_negotiable')->default(false);
            $table->boolean('vat_deductible')->default(false);
            $table->boolean('customs_cleared')->nullable();

            $table->text('description')->nullable();

            // Feature keys only (for example "air_conditioning"), never free text.
            $table->json('features')->nullable();

            $table->char('country_code', 2)->nullable();
            $table->foreignId('city_id')->nullable()->constrained('cities')->restrictOnDelete();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Normalized, script-insensitive searchable text. See TextNormalizer.
            $table->text('search_text')->nullable();

            $table->unsignedInteger('view_count')->default(0);
            $table->unsignedInteger('contact_count')->default(0);

            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('bumped_at')->nullable();
            $table->timestamp('featured_until')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('country_code')
                ->references('code')
                ->on('countries')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->fullText('search_text');
            $table->index(['status', 'expires_at']);
            $table->index(['status', 'price_eur']);
            $table->index(['status', 'bumped_at']);
            $table->index(['status', 'country_code']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
