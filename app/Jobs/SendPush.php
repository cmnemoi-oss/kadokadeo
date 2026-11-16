<?php

namespace App\Jobs;

use App\Http\Resources\UserNotificationResource;
use App\Models\PushSubscription;
use App\Models\UserNotification;
use App\Push\PushMessages;
use App\Push\PushOutcome;
use App\Push\PushSender;
use App\Settings\SiteSettings;
use App\Support\LocaleResolver;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use RuntimeException;

// The push of a notification to a device (App\Push\PushChannel). Read again when it is sent: nothing if the
// notification is gone or read meanwhile, if the device went to another player, or if the pushes were turned off.
// A push service down is tried again for about two hours, then the push is dropped (failed_jobs).
class SendPush implements ShouldQueue
{
    use Queueable;

    // in seconds, after each try that failed
    private const RETRY_DELAYS = [60, 300, 1800, 7200];

    public int $tries = 5;

    public function __construct(public readonly int $subscriptionId, public readonly int $notificationId) {}

    /** @return list<int> */
    public function backoff(): array
    {
        return self::RETRY_DELAYS;
    }

    public function handle(PushSender $pushServices, SiteSettings $settings): void
    {
        $subscription = PushSubscription::query()->with('user')->find($this->subscriptionId);
        $notification = UserNotification::query()->with(UserNotificationResource::RELATIONS)->find($this->notificationId);
        if (!$settings->push_enabled || !$this->isStillToTell($notification, $subscription)) {
            return;
        }

        $locale = LocaleResolver::resolve($settings->i18n_enabled, $subscription->user->locale, $subscription->accept_language);
        match ($pushServices->send($subscription, PushMessages::for($notification, $locale))) {
            PushOutcome::DELIVERED => null,
            PushOutcome::GONE => $subscription->delete(),
            PushOutcome::RETRY => $this->tryAgainLater(),
            PushOutcome::REJECTED => $this->refused(),
        };
    }

    // a comment deleted takes its notifications with it
    private function isStillToTell(?UserNotification $notification, ?PushSubscription $subscription): bool
    {
        return $notification !== null && $subscription !== null
            && $notification->read_at === null
            && ($notification->comment_id === null || $notification->comment !== null)
            && $subscription->user_id === $notification->user_id;
    }

    // (released rather than thrown: a push service down is not an error of the site to report)
    private function tryAgainLater(): void
    {
        if ($this->attempts() >= $this->tries) {
            $this->fail(new RuntimeException("The push service of the device {$this->subscriptionId} stayed down."));

            return;
        }
        $this->release(self::RETRY_DELAYS[$this->attempts() - 1]);
    }

    private function refused(): void
    {
        $exception = new RuntimeException("The push service of the device {$this->subscriptionId} refused the push: its payload or the keys of the server (VAPID).");
        report($exception);
        $this->fail($exception);
    }
}
