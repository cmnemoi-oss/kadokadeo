<?php

namespace Tests\Concerns;

use App\Settings\SiteSettings;

// the pushes are off until the admin turns them on (SiteSettings::$push_enabled): turned on for the tests of the pushes
trait EnablesPush
{
    protected function setUpEnablesPush(): void
    {
        $this->setPushEnabled(true);
    }

    protected function setPushEnabled(bool $enabled): void
    {
        $settings = app(SiteSettings::class);
        $settings->push_enabled = $enabled;
        $settings->save();
    }
}
