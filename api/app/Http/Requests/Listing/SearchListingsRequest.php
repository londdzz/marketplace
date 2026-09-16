<?php

declare(strict_types=1);

namespace App\Http\Requests\Listing;

use App\Enums\FuelType;
use App\Enums\Transmission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
        return [
            'q' => ['sometimes', 'nullable', 'string', 'max:120'],
            'make_id' => ['sometimes', 'nullable', 'integer', Rule::exists('makes', 'id')],
            'model_id' => ['sometimes', 'nullable', 'integer', Rule::exists('models', 'id')],
            'year_min' => ['sometimes', 'nullable', 'integer', 'min:'.config('listings.year_min')],
            'year_max' => ['sometimes', 'nullable', 'integer', 'min:'.config('listings.year_min')],
            'price_min' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'price_max' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'mileage_max' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'fuel' => ['sometimes', 'nullable', 'array'],
            'fuel.*' => [Rule::enum(FuelType::class)],
            'transmission' => ['sometimes', 'nullable', Rule::enum(Transmission::class)],
            'body_type' => ['sometimes', 'nullable', Rule::in(config('listings.body_types'))],
            'countries' => ['sometimes', 'nullable', 'array'],
            'countries.*' => ['string', 'size:2', Rule::exists('countries', 'code')],
            'city_id' => ['sometimes', 'nullable', 'integer', Rule::exists('cities', 'id')],
            'radius_km' => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:'.config('listings.search.max_radius_km')],
            'lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'sort' => ['sometimes', 'nullable', Rule::in(['relevance', 'price_asc', 'price_desc', 'newest', 'mileage_asc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:'.config('listings.search.max_per_page')],
        ];
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
