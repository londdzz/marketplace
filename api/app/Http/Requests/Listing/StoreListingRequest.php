<?php

declare(strict_types=1);

namespace App\Http\Requests\Listing;

use App\Enums\FuelType;
use App\Enums\Transmission;
use App\Models\City;
use App\Models\VehicleModel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Opens a draft. Every field is optional, because the sell flow saves after
 * each step and the first step only knows the make and the model. What a
 * listing must have to go live is checked at publish time instead.
 *
 * Status is absent on purpose: a client can never set it.
 */
class StoreListingRequest extends FormRequest
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
            'make_id' => ['sometimes', 'nullable', 'integer', Rule::exists('makes', 'id')],
            'model_id' => ['sometimes', 'nullable', 'integer', Rule::exists('models', 'id')],
            'variant' => ['sometimes', 'nullable', 'string', 'max:120'],
            'year' => ['sometimes', 'nullable', 'integer', 'min:'.config('listings.year_min'), 'max:'.(date('Y') + 1)],
            'mileage_km' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:'.config('listings.mileage_max')],
            'fuel' => ['sometimes', 'nullable', Rule::enum(FuelType::class)],
            'transmission' => ['sometimes', 'nullable', Rule::enum(Transmission::class)],
            'body_type' => ['sometimes', 'nullable', Rule::in(config('listings.body_types'))],
            'engine_cc' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:'.config('listings.engine_cc_max')],
            'power_hp' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:'.config('listings.power_hp_max')],
            'drivetrain' => ['sometimes', 'nullable', Rule::in(config('listings.drivetrains'))],
            'color' => ['sometimes', 'nullable', Rule::in(config('listings.colors'))],
            'doors' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:9'],
            'seats' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:9'],
            'price_eur' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:'.config('listings.price_eur_max')],
            'price_negotiable' => ['sometimes', 'boolean'],
            'vat_deductible' => ['sometimes', 'boolean'],
            'customs_cleared' => ['sometimes', 'nullable', 'boolean'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'features' => ['sometimes', 'nullable', 'array'],
            'features.*' => [Rule::in(config('listings.features'))],
            'country_code' => ['sometimes', 'nullable', 'string', 'size:2', Rule::exists('countries', 'code')->where('active', true)],
            'city_id' => ['sometimes', 'nullable', 'integer', Rule::exists('cities', 'id')],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->checkModelBelongsToMake($validator),
            fn (Validator $validator) => $this->checkCityBelongsToCountry($validator),
        ];
    }

    /**
     * A Golf is a Volkswagen. Accepting a model from another make would make
     * both the search filters and the listing title nonsense.
     */
    protected function checkModelBelongsToMake(Validator $validator): void
    {
        $modelId = $this->input('model_id', $this->route('listing')?->model_id);
        $makeId = $this->input('make_id', $this->route('listing')?->make_id);

        if ($validator->errors()->isNotEmpty() || $modelId === null || $makeId === null) {
            return;
        }

        $belongs = VehicleModel::query()
            ->whereKey($modelId)
            ->where('make_id', $makeId)
            ->exists();

        if (! $belongs) {
            $validator->errors()->add('model_id', (string) __('validation.model_not_in_make'));
        }
    }

    protected function checkCityBelongsToCountry(Validator $validator): void
    {
        $cityId = $this->input('city_id');
        $countryCode = $this->input('country_code', $this->route('listing')?->country_code)
            ?? $this->user()?->country_code;

        if ($validator->errors()->isNotEmpty() || $cityId === null || $countryCode === null) {
            return;
        }

        $belongs = City::query()
            ->whereKey($cityId)
            ->where('country_code', $countryCode)
            ->exists();

        if (! $belongs) {
            $validator->errors()->add('city_id', (string) __('validation.city_not_in_country'));
        }
    }
}
