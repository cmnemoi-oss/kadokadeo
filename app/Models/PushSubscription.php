<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// a device of a player subscribed to the pushes (App\Services\PushSubscriptionService)
class PushSubscription extends Model
{
    protected $fillable = ['user_id', 'endpoint', 'public_key', 'auth_token', 'accept_language'];

    protected $hidden = ['public_key', 'auth_token'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
