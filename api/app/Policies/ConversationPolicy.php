<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

/**
 * A conversation belongs to exactly two people. Nobody else can read it or
 * write to it.
 */
class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user);
    }

    public function reply(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user) && ! $user->isBlocked();
    }
}
