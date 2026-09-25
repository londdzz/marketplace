<?php

declare(strict_types=1);

use App\Enums\VehicleType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Motorcycles, in the tables cars already use.
 *
 * Everything that exists before this migration is a car, which is why every
 * default here is `car` and why the column can be added to a table with rows
 * in it without a backfill.
 *
 * A make can sell both — BMW, Honda, Suzuki and Yamaha all do — so it carries
 * a flag per kind rather than a type. A model cannot: an R 1250 GS is a
 * motorcycle and an X5 is a car, and nothing is both.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table): void {
            $table->enum('vehicle_type', VehicleType::values())
                ->default(VehicleType::Car->value)
                ->after('user_id');

            // Search always narrows by type first, and only ever shows active
            // listings, so the index leads with the pair.
            $table->index(['vehicle_type', 'status', 'bumped_at']);
        });

        Schema::table('makes', function (Blueprint $table): void {
            $table->boolean('cars')->default(true)->after('popular');
            $table->boolean('motorcycles')->default(false)->after('cars');

            // Which makes lead the picker is a different answer per kind:
            // Suzuki is an also-ran among cars here and one of the first names
            // in motorcycles. The existing `popular` column keeps its meaning
            // and is the car answer, since every make in the table until now
            // sold cars and nothing else.
            $table->boolean('popular_motorcycles')->default(false)->after('motorcycles');
        });

        Schema::table('models', function (Blueprint $table): void {
            $table->enum('vehicle_type', VehicleType::values())
                ->default(VehicleType::Car->value)
                ->after('make_id');

            $table->index(['make_id', 'vehicle_type']);

            // A model was unique within its make. With two kinds in the table
            // the kind is part of what makes it unique: Honda sells a car
            // called Integra and a scooter called Integra, and they are two
            // different vehicles rather than one row entered twice.
            $table->dropUnique('models_make_id_name_unique');
            $table->unique(['make_id', 'vehicle_type', 'name']);
        });
    }

    public function down(): void
    {
        // Undoing this takes the motorcycles with it. There is nowhere for a
        // motorcycle model to live in a table that only holds cars, and the
        // narrower unique key being restored below would reject the second of
        // Honda's two Integras. Rows this migration made possible are the ones
        // it removes; nothing that existed before it is touched.
        DB::table('listings')->where('vehicle_type', VehicleType::Motorcycle->value)->delete();
        DB::table('models')->where('vehicle_type', VehicleType::Motorcycle->value)->delete();

        Schema::table('listings', function (Blueprint $table): void {
            $table->dropIndex(['vehicle_type', 'status', 'bumped_at']);
            $table->dropColumn('vehicle_type');
        });

        Schema::table('makes', function (Blueprint $table): void {
            $table->dropColumn(['cars', 'motorcycles', 'popular_motorcycles']);
        });

        // Order matters: `models.make_id` is a foreign key and MySQL will not
        // leave it without an index. The narrower unique key is put back before
        // the index it is replacing is dropped, so there is never a moment when
        // nothing serves the constraint.
        Schema::table('models', function (Blueprint $table): void {
            $table->dropUnique(['make_id', 'vehicle_type', 'name']);
            $table->unique(['make_id', 'name'], 'models_make_id_name_unique');
            $table->dropIndex(['make_id', 'vehicle_type']);
            $table->dropColumn('vehicle_type');
        });
    }
};
