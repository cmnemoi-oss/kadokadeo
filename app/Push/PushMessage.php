<?php

namespace App\Push;

use Illuminate\Support\Str;

// what a device shows of a push (read by resources/js/sw.js): a push with the same tag takes the place of the one before
final readonly class PushMessage
{
    // the push services refuse a payload over 4 KB, encrypted: a long name of clan or of player is cut
    public const MAX_TITLE_LENGTH = 100;

    public const MAX_BODY_LENGTH = 300;

    public string $title;

    public string $body;

    public function __construct(string $title, string $body, public string $url, public string $tag)
    {
        $this->title = Str::limit($title, self::MAX_TITLE_LENGTH - 1, '…');
        $this->body = Str::limit($body, self::MAX_BODY_LENGTH - 1, '…');
    }

    /** @return array{title: string, body: string, url: string, tag: string} */
    public function payload(): array
    {
        return ['title' => $this->title, 'body' => $this->body, 'url' => $this->url, 'tag' => $this->tag];
    }
}
