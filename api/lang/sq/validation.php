<?php

declare(strict_types=1);

/*
 * The rules this application actually uses, translated. Anything not listed
 * falls back to the English file, which carries Laravel's full set.
 */

return [
    'required' => 'Fusha :attribute është e detyrueshme.',
    'required_if' => 'Fusha :attribute është e detyrueshme kur :other është :value.',
    'string' => 'Fusha :attribute duhet të jetë tekst.',
    'integer' => 'Fusha :attribute duhet të jetë numër i plotë.',
    'numeric' => 'Fusha :attribute duhet të jetë numër.',
    'boolean' => 'Fusha :attribute duhet të jetë e vërtetë ose e rreme.',
    'array' => 'Fusha :attribute duhet të jetë listë.',
    'email' => 'Fusha :attribute duhet të jetë adresë e vlefshme email-i.',
    'url' => 'Fusha :attribute duhet të jetë URL e vlefshme.',
    'uuid' => 'Fusha :attribute duhet të jetë UUID i vlefshëm.',
    'date' => 'Fusha :attribute duhet të jetë datë e vlefshme.',
    'in' => 'Vlera e zgjedhur për :attribute nuk është e vlefshme.',
    'not_in' => 'Vlera e zgjedhur për :attribute nuk është e vlefshme.',
    'exists' => 'Vlera e zgjedhur për :attribute nuk është e vlefshme.',
    'unique' => 'Kjo vlerë për :attribute është përdorur tashmë.',
    'regex' => 'Formati i :attribute nuk është i vlefshëm.',
    'digits' => 'Fusha :attribute duhet të ketë :digits shifra.',
    'digits_between' => 'Fusha :attribute duhet të ketë mes :min dhe :max shifrash.',
    'confirmed' => 'Konfirmimi i :attribute nuk përputhet.',
    'prohibited' => 'Fusha :attribute nuk lejohet.',
    'image' => 'Fusha :attribute duhet të jetë imazh.',
    'mimes' => 'Fusha :attribute duhet të jetë skedar i tipit: :values.',
    'file' => 'Fusha :attribute duhet të jetë skedar.',
    'size' => [
        'string' => 'Fusha :attribute duhet të ketë :size karaktere.',
        'numeric' => 'Fusha :attribute duhet të jetë :size.',
        'file' => 'Fusha :attribute duhet të jetë :size kilobajt.',
        'array' => 'Fusha :attribute duhet të përmbajë :size elemente.',
    ],
    'min' => [
        'string' => 'Fusha :attribute duhet të ketë të paktën :min karaktere.',
        'numeric' => 'Fusha :attribute duhet të jetë të paktën :min.',
        'file' => 'Fusha :attribute duhet të jetë të paktën :min kilobajt.',
        'array' => 'Fusha :attribute duhet të përmbajë të paktën :min elemente.',
    ],
    'max' => [
        'string' => 'Fusha :attribute nuk mund të ketë më shumë se :max karaktere.',
        'numeric' => 'Fusha :attribute nuk mund të jetë më shumë se :max.',
        'file' => 'Fusha :attribute nuk mund të jetë më shumë se :max kilobajt.',
        'array' => 'Fusha :attribute nuk mund të përmbajë më shumë se :max elemente.',
    ],
    'between' => [
        'string' => 'Fusha :attribute duhet të ketë mes :min dhe :max karaktere.',
        'numeric' => 'Fusha :attribute duhet të jetë mes :min dhe :max.',
        'file' => 'Fusha :attribute duhet të jetë mes :min dhe :max kilobajt.',
        'array' => 'Fusha :attribute duhet të përmbajë mes :min dhe :max elemente.',
    ],
    'city_not_in_country' => 'Qyteti i zgjedhur nuk i përket shtetit të zgjedhur.',
    'custom' => [
    ],
    'attributes' => [
        'phone' => 'numri i telefonit',
        'phone_prefix' => 'prefiksi',
        'code' => 'kodi',
        'display_name' => 'emri',
        'preferred_language' => 'gjuha',
        'country_code' => 'shteti',
        'city_id' => 'qyteti',
        'seller_type' => 'lloji i shitësit',
        'dealer_name' => 'emri i tregtarit',
        'locale' => 'gjuha',
        'device_name' => 'pajisja',
    ],
];
