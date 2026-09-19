<?php

declare(strict_types=1);

return [
    'publish' => [
        'not_ready' => 'This listing still needs a few details before it can go live.',
        'wrong_status' => 'This listing cannot be published from its current state.',
    ],
    'promote' => [
        'wrong_status' => 'Only a live listing can be promoted.',
        'out_of_range' => 'That is not an amount of credits a promotion can take.',
    ],

    'renew' => [
        'wrong_status' => 'Only a live or recently expired listing can be renewed.',
    ],
    'sold' => [
        'wrong_status' => 'Only a live or recently expired listing can be marked as sold.',
    ],
    'photos' => [
        'too_many' => 'A listing can carry at most :max photos.',
    ],
    'status' => [
        'draft' => 'Draft',
        'pending_payment' => 'Pending payment',
        'active' => 'Active',
        'expired' => 'Expired',
        'sold' => 'Sold',
        'removed' => 'Removed',
    ],
    'fuel' => [
        'diesel' => 'Diesel',
        'petrol' => 'Petrol',
        'hybrid' => 'Hybrid',
        'electric' => 'Electric',
        'lpg' => 'LPG',
    ],
    'transmission' => [
        'manual' => 'Manual',
        'automatic' => 'Automatic',
    ],
];
