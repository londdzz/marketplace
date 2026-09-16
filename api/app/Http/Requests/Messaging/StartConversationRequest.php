<?php

declare(strict_types=1);

namespace App\Http\Requests\Messaging;

use Illuminate\Foundation\Http\FormRequest;

class StartConversationRequest extends FormRequest
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
            'body' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    public function body(): ?string
    {
        $body = $this->validated('body');

        return is_string($body) && trim($body) !== '' ? trim($body) : null;
    }
}
