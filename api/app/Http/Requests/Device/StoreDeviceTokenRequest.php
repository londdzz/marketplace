<?php

declare(strict_types=1);

namespace App\Http\Requests\Device;

use App\Enums\Platform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeviceTokenRequest extends FormRequest
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
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['required', Rule::enum(Platform::class)],
        ];
    }

    public function token(): string
    {
        return (string) $this->validated('token');
    }

    public function platform(): Platform
    {
        return Platform::from((string) $this->validated('platform'));
    }
}
