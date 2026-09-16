<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

/**
 * An account is only ever readable or writable by its owner.
 */
class UserPolicy
{
    public function view(User $user, User $subject): bool
    {
        return $user->is($subject);
    }

    public function update(User $user, User $subject): bool
    {
        return $user->is($subject);
    }

    public function delete(User $user, User $subject): bool
    {
        return $user->is($subject);
    }
}
