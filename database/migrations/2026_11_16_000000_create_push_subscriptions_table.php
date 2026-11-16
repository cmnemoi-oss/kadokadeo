<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration
{
    public function up(): void
    {
        // the devices of the players subscribed to the pushes (App\Services\PushSubscriptionService)
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // the address of the device at the push service of its browser: one player by device
            $table->string('endpoint', 500)->unique();
            // to encrypt the pushes for the device (keys.p256dh, keys.auth of the browser, base64url)
            $table->string('public_key', 100);
            $table->string('auth_token', 50);
            // the languages of the browser, for a player with the language « auto » (App\Support\LocaleResolver)
            $table->string('accept_language')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
