<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One person's answer to "how are we doing?".
 *
 * @property int $id
 * @property int $user_id
 * @property int $score
 * @property string|null $note
 */
class AppFeedback extends Model
{
    protected $table = 'app_feedback';

    protected $fillable = ['user_id', 'score', 'note'];

    protected function casts(): array
    {
        return ['score' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
