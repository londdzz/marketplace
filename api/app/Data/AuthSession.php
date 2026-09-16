<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\User;

/**
 * A freshly issued Sanctum token together with the user it belongs to.
 */
final readonly class AuthSession
{
    public function __construct(
        public User $user,
        public string $token,
    ) {}
}
