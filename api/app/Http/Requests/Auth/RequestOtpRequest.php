<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalize before validating, so "044 123 456" and "+383 44 123 456"
     * reach the rules as the same number.
     */
    protected function prepareForValidation(): void
    {
        $prefix = $this->input('phone_prefix');

        $this->merge([
            'phone' => PhoneNumber::normalize(
                (string) $this->input('phone', ''),
                is_string($prefix) ? $prefix : null,
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{7,14}$/'],
            'phone_prefix' => ['sometimes', 'nullable', 'string', 'max:8'],
            'locale' => ['sometimes', 'nullable', 'string', Rule::in(config('app.supported_locales'))],
        ];
    }

    public function phone(): string
    {
        return (string) $this->validated('phone');
    }

    public function locale(): ?string
    {
        $locale = $this->validated('locale');

        return is_string($locale) ? $locale : null;
    }
}
