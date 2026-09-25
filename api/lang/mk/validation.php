<?php

declare(strict_types=1);

/*
 * The rules this application actually uses, translated. Anything not listed
 * falls back to the English file, which carries Laravel's full set.
 */

return [
    'required' => 'Полето :attribute е задолжително.',
    'required_if' => 'Полето :attribute е задолжително кога :other е :value.',
    'string' => 'Полето :attribute мора да биде текст.',
    'integer' => 'Полето :attribute мора да биде цел број.',
    'numeric' => 'Полето :attribute мора да биде број.',
    'boolean' => 'Полето :attribute мора да биде точно или неточно.',
    'array' => 'Полето :attribute мора да биде листа.',
    'email' => 'Полето :attribute мора да биде валидна е-пошта.',
    'url' => 'Полето :attribute мора да биде валидна URL адреса.',
    'uuid' => 'Полето :attribute мора да биде валиден UUID.',
    'date' => 'Полето :attribute мора да биде валиден датум.',
    'in' => 'Избраната вредност за :attribute не е валидна.',
    'not_in' => 'Избраната вредност за :attribute не е валидна.',
    'exists' => 'Избраната вредност за :attribute не е валидна.',
    'unique' => 'Вредноста за :attribute е веќе зафатена.',
    'regex' => 'Форматот на :attribute не е валиден.',
    'digits' => 'Полето :attribute мора да има :digits цифри.',
    'digits_between' => 'Полето :attribute мора да има помеѓу :min и :max цифри.',
    'confirmed' => 'Потврдата за :attribute не се совпаѓа.',
    'prohibited' => 'Полето :attribute не е дозволено.',
    'image' => 'Полето :attribute мора да биде слика.',
    'mimes' => 'Полето :attribute мора да биде датотека од тип: :values.',
    'file' => 'Полето :attribute мора да биде датотека.',
    'size' => [
        'string' => 'Полето :attribute мора да има :size знаци.',
        'numeric' => 'Полето :attribute мора да биде :size.',
        'file' => 'Полето :attribute мора да биде :size килобајти.',
        'array' => 'Полето :attribute мора да содржи :size ставки.',
    ],
    'min' => [
        'string' => 'Полето :attribute мора да има најмалку :min знаци.',
        'numeric' => 'Полето :attribute мора да биде најмалку :min.',
        'file' => 'Полето :attribute мора да биде најмалку :min килобајти.',
        'array' => 'Полето :attribute мора да содржи најмалку :min ставки.',
    ],
    'max' => [
        'string' => 'Полето :attribute не смее да има повеќе од :max знаци.',
        'numeric' => 'Полето :attribute не смее да биде поголемо од :max.',
        'file' => 'Полето :attribute не смее да биде поголемо од :max килобајти.',
        'array' => 'Полето :attribute не смее да содржи повеќе од :max ставки.',
    ],
    'between' => [
        'string' => 'Полето :attribute мора да има помеѓу :min и :max знаци.',
        'numeric' => 'Полето :attribute мора да биде помеѓу :min и :max.',
        'file' => 'Полето :attribute мора да биде помеѓу :min и :max килобајти.',
        'array' => 'Полето :attribute мора да содржи помеѓу :min и :max ставки.',
    ],
    'model_not_in_make' => 'Избраниот модел не припаѓа на избраната марка.',
    'model_not_of_vehicle_type' => 'Избраниот модел не е тој вид на возило.',
    'photo_order_mismatch' => 'Новиот редослед мора да ја наведе секоја фотографија од овој оглас точно еднаш.',
    'radius_needs_origin' => 'Радиусот бара координати или град од кој ќе се мери.',
    'coordinates_need_both' => 'Географската ширина и должина мора да се дадат заедно.',
    'city_not_in_country' => 'Избраниот град не припаѓа на избраната земја.',
    'custom' => [
    ],
    'attributes' => [
        'phone' => 'телефонски број',
        'phone_prefix' => 'повикувачки број',
        'code' => 'код',
        'display_name' => 'име',
        'preferred_language' => 'јазик',
        'country_code' => 'земја',
        'city_id' => 'град',
        'seller_type' => 'тип на продавач',
        'dealer_name' => 'име на салонот',
        'locale' => 'јазик',
        'device_name' => 'уред',
    ],
];
