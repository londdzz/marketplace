<?php

declare(strict_types=1);

namespace App\Http\Requests\Listing;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReorderPhotosRequest extends FormRequest
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
            'photo_ids' => ['required', 'array', 'min:1'],
            'photo_ids.*' => ['required', 'uuid', Rule::exists('listing_photos', 'id')],
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

                $listing = $this->route('listing');
                $submitted = $this->photoIds();
                $owned = $listing->photos()->pluck('id')->all();

                // The new order has to name this listing's photos, all of them,
                // exactly once each.
                sort($submitted);
                sort($owned);

                if ($submitted !== $owned) {
                    $validator->errors()->add('photo_ids', (string) __('validation.photo_order_mismatch'));
                }
            },
        ];
    }

    /**
     * @return array<int, string>
     */
    public function photoIds(): array
    {
        return array_values($this->validated('photo_ids'));
    }
}
