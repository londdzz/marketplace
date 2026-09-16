<?php

declare(strict_types=1);

namespace App\Data;

/**
 * One notification, carried as translation keys rather than finished text: the
 * wording is chosen per recipient, in the language they picked.
 */
final readonly class PushMessage
{
    /**
     * @param  array<string, mixed>  $titleReplacements
     * @param  array<string, mixed>  $bodyReplacements
     * @param  array<string, string>  $data  payload the app routes on, such as a listing id
     */
    public function __construct(
        public string $titleKey,
        public string $bodyKey,
        public array $titleReplacements = [],
        public array $bodyReplacements = [],
        public array $data = [],
        public ?int $badge = null,
    ) {}

    public function title(string $locale): string
    {
        return (string) __($this->titleKey, $this->titleReplacements, $locale);
    }

    public function body(string $locale): string
    {
        return (string) __($this->bodyKey, $this->bodyReplacements, $locale);
    }
}
