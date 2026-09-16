<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

final class TooManyPhotosException extends HttpException
{
    public function __construct(public readonly int $limit)
    {
        parent::__construct(422, (string) __('listing.photos.too_many', ['max' => $limit]));
    }
}
