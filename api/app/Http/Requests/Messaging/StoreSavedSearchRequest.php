<?php

declare(strict_types=1);

namespace App\Http\Requests\Messaging;

use App\Support\ListingFilterRules;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A saved search holds the same filters the search endpoint accepts, validated
 * by the same rules, so a saved search can never hold something search would
 * reject.
 */
class StoreSavedSearchRequest extends FormRequest
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
        return array_merge([
            'name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'filters' => ['required', 'array'],
            'notify' => ['sometimes', 'boolean'],
        ], ListingFilterRules::rules('filters'));
    }

    /**
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        return (array) $this->validated('filters');
    }
}
