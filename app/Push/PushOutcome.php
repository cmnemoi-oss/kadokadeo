<?php

namespace App\Push;

// what the push service of a device answered to a push (App\Jobs\SendPush)
enum PushOutcome
{
    case DELIVERED;
    // the device left its push service (unsubscribed, browser reinstalled): forgotten
    case GONE;
    // the push service is down or asks to slow down: tried again later
    case RETRY;
    // the push service refuses it for good (the payload, the keys of the server): our fault, trying again would not help
    case REJECTED;
}
