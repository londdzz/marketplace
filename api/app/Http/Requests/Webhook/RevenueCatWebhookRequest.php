<?php

declare(strict_types=1);

namespace App\Http\Requests\Webhook;

use Illuminate\Foundation\Http\FormRequest;

class RevenueCatWebhookRequest extends FormRequest
{
    /**
     * The shared secret is checked by middleware before this runs.
     */
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
            'event' => ['required', 'array'],
            'event.type' => ['required', 'string', 'max:64'],
            'event.id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'event.app_user_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'event.product_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'event.transaction_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'event.original_transaction_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'event.store' => ['sometimes', 'nullable', 'string', 'max:64'],
            'event.price' => ['sometimes', 'nullable', 'numeric'],
            'event.currency' => ['sometimes', 'nullable', 'string', 'size:3'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function event(): array
    {
        return (array) $this->validated('event');
    }
}
