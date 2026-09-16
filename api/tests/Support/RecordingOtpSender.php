<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Contracts\OtpSender;
use Throwable;

/**
 * Stands in for a real delivery channel and keeps what it was asked to send,
 * which is the only way a test can learn a code: the database holds a hash.
 */
final class RecordingOtpSender implements OtpSender
{
    /**
     * @var array<int, array{phone: string, code: string, locale: string}>
     */
    public array $sent = [];

    public ?Throwable $failWith = null;

    public function send(string $phone, string $code, string $locale): void
    {
        if ($this->failWith instanceof Throwable) {
            throw $this->failWith;
        }

        $this->sent[] = ['phone' => $phone, 'code' => $code, 'locale' => $locale];
    }

    public function lastCode(): string
    {
        $last = end($this->sent);

        return $last === false ? '' : $last['code'];
    }

    public function lastLocale(): string
    {
        $last = end($this->sent);

        return $last === false ? '' : $last['locale'];
    }

    public function count(): int
    {
        return count($this->sent);
    }
}
