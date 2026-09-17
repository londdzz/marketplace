<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Blocking another person.
 *
 * Both stores require it of any app where strangers can message each other,
 * and it is the only real answer a person has to someone behaving badly at
 * two in the morning. It hides rather than deletes: the listings and the
 * conversation survive, and unblocking brings them back.
 *
 * It cuts both ways on purpose. Someone I block cannot see my listings or
 * write to me either — a block that only worked in one direction would be an
 * invitation to keep going from the other side.
 */
final class BlockService
{
    public function block(User $blocker, User $blocked): UserBlock
    {
        if ($blocker->getKey() === $blocked->getKey()) {
            throw new HttpException(422, (string) __('block.self'));
        }

        return DB::transaction(static fn (): UserBlock => UserBlock::query()->firstOrCreate(
            ['blocker_id' => $blocker->getKey(), 'blocked_id' => $blocked->getKey()],
            ['created_at' => Carbon::now()],
        ));
    }

    /**
     * Unblocking is silent and complete: everything hidden comes back.
     */
    public function unblock(User $blocker, User $blocked): void
    {
        UserBlock::query()
            ->where('blocker_id', $blocker->getKey())
            ->where('blocked_id', $blocked->getKey())
            ->delete();
    }

    public function blocks(User $blocker, User $blocked): bool
    {
        return UserBlock::query()
            ->where('blocker_id', $blocker->getKey())
            ->where('blocked_id', $blocked->getKey())
            ->exists();
    }

    /**
     * True when either of them has blocked the other, which is the question
     * every policy actually needs to ask.
     */
    public function eitherWay(User $one, User $other): bool
    {
        if ($one->getKey() === $other->getKey()) {
            return false;
        }

        return UserBlock::query()
            ->where(function ($query) use ($one, $other): void {
                $query->where('blocker_id', $one->getKey())->where('blocked_id', $other->getKey());
            })
            ->orWhere(function ($query) use ($one, $other): void {
                $query->where('blocker_id', $other->getKey())->where('blocked_id', $one->getKey());
            })
            ->exists();
    }

    /**
     * Every account this one cannot see and cannot be seen by, in one query.
     * Search asks for this on every request, so it is a single flat list of
     * ids rather than two relations loaded separately.
     *
     * @return array<int, int>
     */
    public function hiddenFrom(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        return UserBlock::query()
            ->where('blocker_id', $user->getKey())
            ->orWhere('blocked_id', $user->getKey())
            ->get(['blocker_id', 'blocked_id'])
            ->flatMap(static fn (UserBlock $block): array => [$block->blocker_id, $block->blocked_id])
            ->unique()
            ->reject(static fn (int $id): bool => $id === $user->getKey())
            ->values()
            ->all();
    }

    /**
     * The list the profile shows, newest first.
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function blockedBy(User $blocker, int $perPage = 50): LengthAwarePaginator
    {
        return $blocker->blockedUsers()
            ->orderByPivot('created_at', 'desc')
            ->paginate($perPage);
    }
}
