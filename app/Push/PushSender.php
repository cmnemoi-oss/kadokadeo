<?php

namespace App\Push;

use App\Models\PushSubscription;

// sends a push to a device through the push service of its browser
interface PushSender
{
    public function send(PushSubscription $subscription, PushMessage $message): PushOutcome;
}
