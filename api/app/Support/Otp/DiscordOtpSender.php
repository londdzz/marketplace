<?php

declare(strict_types=1);

namespace App\Support\Otp;

use App\Contracts\OtpSender;
use App\Exceptions\OtpDeliveryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Posts the code to a Discord webhook instead of sending it to the person
 * signing in.
 *
 * **This is the log driver with a better letterbox, and it is exactly as
 * dangerous.** Nothing reaches the phone of whoever asked for the code;
 * everyone who can read the channel can sign in as any number that appears in
 * it, and a seller's telephone number sits behind an account. It exists for
 * the stage where a build is going to friends, no aggregator has been paid
 * for, and reading codes means an SSH session and a log file. A private
 * channel in a server you own, and empty before anybody real signs in.
 *
 * **The number is not masked here**, unlike everywhere else it is written
 * down. Masking is what makes a log safe to keep, but the whole job of this
 * driver is telling you which of three friends waiting on you is which, and
 * `+389*****001` cannot do that. That is the trade, made deliberately, and it
 * is the other reason this belongs in a private channel.
 *
 * It fails loudly, like the senders that really send: a code Discord never
 * took is a code nobody will ever read, and answering "on its way" to that
 * leaves somebody staring at an empty box.
 */
final class DiscordOtpSender implements OtpSender
{
    public function send(string $phone, string $code, string $locale): void
    {
        $config = config('otp.discord');
        $url = $config['webhook_url'] ?? null;

        if (! is_string($url) || $url === '') {
            Log::error('Discord OTP delivery has no webhook URL.');

            throw new OtpDeliveryException;
        }

        try {
            $response = Http::timeout((int) $config['timeout'])
                ->asJson()
                ->post($url, [
                    // Backticks so the code is a tap-to-copy block on the
                    // phone rather than a run of digits inside a sentence.
                    'content' => sprintf(
                        "**%s** → `%s`\nExpires in %d minutes · %s",
                        $phone,
                        $code,
                        (int) config('otp.ttl_minutes'),
                        strtoupper($locale),
                    ),
                    // Nothing in here should ping anybody. The channel is
                    // being watched for a code, not announced to a server.
                    'allowed_mentions' => ['parse' => []],
                ]);
        } catch (ConnectionException $e) {
            Log::warning('Discord OTP delivery could not reach the webhook.');

            throw new OtpDeliveryException($e);
        }

        if ($response->failed()) {
            // 401 and 404 both mean the URL is wrong or the webhook has been
            // deleted; 429 means Discord is rate limiting, which one person
            // relaying codes will not hit but a loop will.
            Log::warning('Discord refused the webhook post.', [
                'status' => $response->status(),
            ]);

            throw new OtpDeliveryException;
        }
    }
}
