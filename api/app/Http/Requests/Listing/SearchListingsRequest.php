<?php

declare(strict_types=1);

namespace App\Http\Requests\Listing;

use App\Support\ListingFilterRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SearchListingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $countries = $this->input('countries');

        if (is_string($countries)) {
            $countries = explode(',', $countries);
        }

        if (is_array($countries)) {
            $this->merge(['countries' => array_map('strtoupper', array_filter($countries, 'is_string'))]);
        }

        $fuel = $this->input('fuel');

        if (is_string($fuel)) {
            $this->merge(['fuel' => explode(',', $fuel)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge(ListingFilterRules::rules(), [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:'.config('listings.search.max_per_page')],
        ]);
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                // A radius needs somewhere to measure from: either explicit
                // coordinates or a city to take them from.
                if ($this->filled('radius_km')
                    && ! ($this->filled('lat') && $this->filled('lng'))
                    && ! $this->filled('city_id')) {
                    $validator->errors()->add('radius_km', (string) __('validation.radius_needs_origin'));
                }

                if ($this->filled('lat') !== $this->filled('lng')) {
                    $validator->errors()->add('lat', (string) __('validation.coordinates_need_both'));
                }
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        return $this->validated();
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? config('listings.search.per_page'));
    }

    public function sort(): string
    {
        return (string) ($this->validated('sort') ?? 'relevance');
    }
}
