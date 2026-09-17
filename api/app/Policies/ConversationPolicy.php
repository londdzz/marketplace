<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use App\Services\BlockService;

/**
 * A conversation belongs to exactly two people. Nobody else can read it or
 * write to it.
 */
class ConversationPolicy
{
    public function __construct(private readonly BlockService $blocks) {}

    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user) && ! $this->blockedApart($user, $conversation);
    }

    public function reply(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user)
            && ! $user->isBlocked()
            && ! $this->blockedApart($user, $conversation);
    }

    /**
     * Either side having blocked the other closes the thread for both of them.
     */
    private function blockedApart(User $user, Conversation $conversation): bool
    {
        $other = $conversation->counterpartFor($user);

        return $other !== null && $this->blocks->eitherWay($user, $other);
    }
}
