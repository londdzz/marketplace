<?php

declare(strict_types=1);

namespace App\Http\Requests\Listing;

use Illuminate\Foundation\Http\FormRequest;

/**
 * How many credits the seller chose to put behind a listing.
 */
class PromoteListingRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'credits' => [
                'required',
                'integer',
                'min:'.(int) config('credits.promote.min_credits'),
                'max:'.(int) config('credits.promote.max_credits'),
            ],
        ];
    }

    public function credits(): int
    {
        return (int) $this->validated('credits');
    }
}
