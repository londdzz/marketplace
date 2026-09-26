<?php

declare(strict_types=1);

use App\Enums\SponsorSlot;
use App\Enums\VehicleType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sponsors: a picture, where to put it, and where it goes when tapped.
 *
 * There is no endpoint that writes to this table and no screen that creates
 * one. Rows are added on the server with `sponsors:add`, deliberately: an
 * advertisement anybody could submit is an advertisement nobody is checking,
 * and the specification rules out an admin interface.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sponsors', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->enum('slot', SponsorSlot::values());

            // The advertisement itself. The sponsor supplies the artwork, so
            // nothing here styles it — there is no headline to argue over and
            // no copy to translate into five languages.
            $table->string('image_path');

            // Not optional. It is what a screen reader reads out and what is
            // drawn when the picture fails to load, and a picture with no
            // description is an advertisement some people simply cannot see.
            $table->string('alt');

            // Where tapping goes. Null is a sponsor who bought presence
            // rather than a click, and the card then does not look tappable.
            $table->string('link_url')->nullable();

            // Null shows to everyone. Set, it shows only to somebody browsing
            // that catalogue — a tyre shop for motorcycles beside a car.
            $table->enum('vehicle_type', VehicleType::values())->nullable();

            // Ordering inside a slot, lowest first, so a booking can be put
            // at the front of the carousel without touching the others.
            $table->unsignedTinyInteger('position')->default(0);

            // A booking with dates runs itself: nobody has to remember to
            // take it down the morning it ends.
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();

            $table->boolean('active')->default(true);
            $table->timestamps();

            // What every read asks for: the live ones in a slot, in order.
            $table->index(['slot', 'active', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsors');
    }
};
