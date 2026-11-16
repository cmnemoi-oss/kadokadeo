<?php

namespace App\Http\Middleware;

use App\Settings\SiteSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// the routes of the pushes, unknown while they are turned off in the admin (SiteSettings::$push_enabled)
class EnsurePushIsEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(app(SiteSettings::class)->push_enabled, Response::HTTP_NOT_FOUND);

        return $next($request);
    }
}
