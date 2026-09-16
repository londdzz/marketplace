<?php

declare(strict_types=1);

return [
    'publish' => [
        'not_ready' => 'Kësaj shpallje i mungojnë ende disa të dhëna para se të publikohet.',
        'wrong_status' => 'Kjo shpallje nuk mund të publikohet nga gjendja e saj aktuale.',
    ],
    'renew' => [
        'wrong_status' => 'Vetëm një shpallje aktive ose e skaduar së fundmi mund të rinovohet.',
    ],
    'sold' => [
        'wrong_status' => 'Vetëm një shpallje aktive ose e skaduar së fundmi mund të shënohet si e shitur.',
    ],
    'photos' => [
        'too_many' => 'Një shpallje mund të ketë maksimum :max foto.',
    ],
    'status' => [
        'draft' => 'Draft',
        'pending_payment' => 'Në pritje të pagesës',
        'active' => 'Aktive',
        'expired' => 'Skaduar',
        'sold' => 'Shitur',
        'removed' => 'Hequr',
    ],
    'fuel' => [
        'diesel' => 'Naftë',
        'petrol' => 'Benzinë',
        'hybrid' => 'Hibrid',
        'electric' => 'Elektrik',
        'lpg' => 'Gaz (LPG)',
    ],
    'transmission' => [
        'manual' => 'Manual',
        'automatic' => 'Automatik',
    ],
];
