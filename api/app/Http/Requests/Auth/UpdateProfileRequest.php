<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Enums\SellerType;
use App\Models\City;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The phone number is the login identity and credits are ledger-controlled, so
 * neither can be changed here.
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('country_code'))) {
            $this->merge(['country_code' => strtoupper($this->input('country_code'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'preferred_language' => ['sometimes', 'string', Rule::in(config('app.supported_locales'))],
            'country_code' => [
                'sometimes',
                'string',
                'size:2',
                Rule::exists('countries', 'code')->where('active', true),
            ],
            'city_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('cities', 'id'),
            ],
            'seller_type' => ['sometimes', Rule::enum(SellerType::class)],
            'dealer_name' => [
                'nullable',
                'string',
                'max:160',
                // A dealer has to be named, unless the account already carries
                // a name from an earlier update.
                Rule::requiredIf(fn (): bool => $this->input('seller_type') === SellerType::Dealer->value
                    && blank($this->user()?->dealer_name)),
            ],
        ];
    }

    /**
     * The city has to sit in the country the account belongs to, otherwise
     * cross-border badges and radius search would disagree with each other.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $cityId = $this->input('city_id');

                if ($cityId === null || $validator->errors()->isNotEmpty()) {
                    return;
                }

                $countryCode = $this->input('country_code') ?? $this->user()?->country_code;

                $belongs = City::query()
                    ->whereKey($cityId)
                    ->where('country_code', $countryCode)
                    ->exists();

                if (! $belongs) {
                    $validator->errors()->add('city_id', (string) __('validation.city_not_in_country'));
                }
            },
        ];
    }
}
