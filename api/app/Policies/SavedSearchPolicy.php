<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SavedSearch;
use App\Models\User;

class SavedSearchPolicy
{
    public function view(User $user, SavedSearch $savedSearch): bool
    {
        return $user->getKey() === $savedSearch->user_id;
    }

    public function update(User $user, SavedSearch $savedSearch): bool
    {
        return $this->view($user, $savedSearch);
    }

    public function delete(User $user, SavedSearch $savedSearch): bool
    {
        return $this->view($user, $savedSearch);
    }
}
