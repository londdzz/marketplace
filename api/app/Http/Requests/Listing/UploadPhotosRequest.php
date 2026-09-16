<?php

declare(strict_types=1);

namespace App\Http\Requests\Listing;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class UploadPhotosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A single upload is accepted as well as a batch, so the app can send one
     * photo at a time and show progress per photo.
     */
    protected function prepareForValidation(): void
    {
        // Read and write the raw file bag rather than hasFile() and file():
        // those build a converted copy on first use, and the copy would not
        // see this change.
        if ($this->files->has('photo') && ! $this->files->has('photos')) {
            $this->files->set('photos', [$this->files->get('photo')]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $max = (int) config('listings.photos.max_per_listing');

        return [
            'photos' => ['required', 'array', 'min:1', 'max:'.$max],
            'photos.*' => [
                'required',
                'file',
                'image',
                'mimes:'.implode(',', config('listings.photos.accepted_mimes')),
                'max:'.config('listings.photos.max_upload_kilobytes'),
            ],
        ];
    }

    /**
     * @return array<int, UploadedFile>
     */
    public function photos(): array
    {
        return array_values($this->file('photos', []));
    }
}
