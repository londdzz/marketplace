<?php

declare(strict_types=1);

namespace App\Http\Requests\Listing;

/**
 * The same rules as opening a draft. Editing a listing can never change its
 * status or its owner, neither of which is accepted here.
 */
class UpdateListingRequest extends StoreListingRequest
{
    //
}
