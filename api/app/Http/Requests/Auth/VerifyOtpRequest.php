<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $prefix = $this->input('phone_prefix');

        $this->merge([
            'phone' => PhoneNumber::normalize(
                (string) $this->input('phone', ''),
                is_string($prefix) ? $prefix : null,
            ),
            'country_code' => is_string($this->input('country_code'))
                ? strtoupper($this->input('country_code'))
                : $this->input('country_code'),
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
            'code' => ['required', 'string', 'digits:'.config('otp.length')],
            'country_code' => [
                'sometimes',
                'nullable',
                'string',
                'size:2',
                Rule::exists('countries', 'code')->where('active', true),
            ],
            'locale' => ['sometimes', 'nullable', 'string', Rule::in(config('app.supported_locales'))],
            'device_name' => ['sometimes', 'nullable', 'string', 'max:120'],
        ];
    }

    public function phone(): string
    {
        return (string) $this->validated('phone');
    }

    public function code(): string
    {
        return (string) $this->validated('code');
    }

    public function countryCode(): ?string
    {
        $country = $this->validated('country_code');

        return is_string($country) ? $country : null;
    }

    public function locale(): ?string
    {
        $locale = $this->validated('locale');

        return is_string($locale) ? $locale : null;
    }

    public function deviceName(): string
    {
        $name = $this->validated('device_name');

        return is_string($name) && $name !== '' ? $name : 'mobile';
    }
}
