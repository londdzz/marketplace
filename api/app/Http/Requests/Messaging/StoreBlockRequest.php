<?php

declare(strict_types=1);

namespace App\Http\Requests\Messaging;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'user_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id'),
                // Blocking yourself would hide your own listings from you.
                Rule::notIn([$this->user()?->getKey()]),
            ],
        ];
    }

    public function target(): User
    {
        return User::query()->findOrFail($this->validated('user_id'));
    }
}
