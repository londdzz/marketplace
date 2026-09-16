<?php

declare(strict_types=1);

/*
 * The rules this application actually uses, translated. Anything not listed
 * falls back to the English file, which carries Laravel's full set.
 */

return [
    'required' => 'Полето :attribute е задължително.',
    'required_if' => 'Полето :attribute е задължително, когато :other е :value.',
    'string' => 'Полето :attribute трябва да бъде текст.',
    'integer' => 'Полето :attribute трябва да бъде цяло число.',
    'numeric' => 'Полето :attribute трябва да бъде число.',
    'boolean' => 'Полето :attribute трябва да бъде вярно или невярно.',
    'array' => 'Полето :attribute трябва да бъде списък.',
    'email' => 'Полето :attribute трябва да бъде валиден имейл адрес.',
    'url' => 'Полето :attribute трябва да бъде валиден URL адрес.',
    'uuid' => 'Полето :attribute трябва да бъде валиден UUID.',
    'date' => 'Полето :attribute трябва да бъде валидна дата.',
    'in' => 'Избраната стойност за :attribute не е валидна.',
    'not_in' => 'Избраната стойност за :attribute не е валидна.',
    'exists' => 'Избраната стойност за :attribute не е валидна.',
    'unique' => 'Стойността за :attribute вече се използва.',
    'regex' => 'Форматът на :attribute не е валиден.',
    'digits' => 'Полето :attribute трябва да съдържа :digits цифри.',
    'digits_between' => 'Полето :attribute трябва да съдържа между :min и :max цифри.',
    'confirmed' => 'Потвърждението за :attribute не съвпада.',
    'prohibited' => 'Полето :attribute не е разрешено.',
    'image' => 'Полето :attribute трябва да бъде изображение.',
    'mimes' => 'Полето :attribute трябва да бъде файл от тип: :values.',
    'file' => 'Полето :attribute трябва да бъде файл.',
    'size' => [
        'string' => 'Полето :attribute трябва да съдържа :size символа.',
        'numeric' => 'Полето :attribute трябва да бъде :size.',
        'file' => 'Полето :attribute трябва да бъде :size килобайта.',
        'array' => 'Полето :attribute трябва да съдържа :size елемента.',
    ],
    'min' => [
        'string' => 'Полето :attribute трябва да съдържа поне :min символа.',
        'numeric' => 'Полето :attribute трябва да бъде поне :min.',
        'file' => 'Полето :attribute трябва да бъде поне :min килобайта.',
        'array' => 'Полето :attribute трябва да съдържа поне :min елемента.',
    ],
    'max' => [
        'string' => 'Полето :attribute не може да съдържа повече от :max символа.',
        'numeric' => 'Полето :attribute не може да бъде по-голямо от :max.',
        'file' => 'Полето :attribute не може да бъде по-голямо от :max килобайта.',
        'array' => 'Полето :attribute не може да съдържа повече от :max елемента.',
    ],
    'between' => [
        'string' => 'Полето :attribute трябва да съдържа между :min и :max символа.',
        'numeric' => 'Полето :attribute трябва да бъде между :min и :max.',
        'file' => 'Полето :attribute трябва да бъде между :min и :max килобайта.',
        'array' => 'Полето :attribute трябва да съдържа между :min и :max елемента.',
    ],
    'city_not_in_country' => 'Избраният град не принадлежи на избраната държава.',
    'custom' => [
    ],
    'attributes' => [
        'phone' => 'телефонен номер',
        'phone_prefix' => 'код за избиране',
        'code' => 'код',
        'display_name' => 'име',
        'preferred_language' => 'език',
        'country_code' => 'държава',
        'city_id' => 'град',
        'seller_type' => 'тип продавач',
        'dealer_name' => 'име на автокъщата',
        'locale' => 'език',
        'device_name' => 'устройство',
    ],
];
