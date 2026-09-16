<?php

declare(strict_types=1);

/*
 * The rules this application actually uses, translated. Anything not listed
 * falls back to the English file, which carries Laravel's full set.
 */

return [
    'required' => 'Поље :attribute је обавезно.',
    'required_if' => 'Поље :attribute је обавезно када је :other једнако :value.',
    'string' => 'Поље :attribute мора бити текст.',
    'integer' => 'Поље :attribute мора бити цео број.',
    'numeric' => 'Поље :attribute мора бити број.',
    'boolean' => 'Поље :attribute мора бити тачно или нетачно.',
    'array' => 'Поље :attribute мора бити листа.',
    'email' => 'Поље :attribute мора бити исправна е-адреса.',
    'url' => 'Поље :attribute мора бити исправан URL.',
    'uuid' => 'Поље :attribute мора бити исправан UUID.',
    'date' => 'Поље :attribute мора бити исправан датум.',
    'in' => 'Изабрана вредност за :attribute није исправна.',
    'not_in' => 'Изабрана вредност за :attribute није исправна.',
    'exists' => 'Изабрана вредност за :attribute није исправна.',
    'unique' => 'Вредност за :attribute је већ заузета.',
    'regex' => 'Формат поља :attribute није исправан.',
    'digits' => 'Поље :attribute мора имати :digits цифара.',
    'digits_between' => 'Поље :attribute мора имати између :min и :max цифара.',
    'confirmed' => 'Потврда за :attribute се не поклапа.',
    'prohibited' => 'Поље :attribute није дозвољено.',
    'image' => 'Поље :attribute мора бити слика.',
    'mimes' => 'Поље :attribute мора бити датотека типа: :values.',
    'file' => 'Поље :attribute мора бити датотека.',
    'size' => [
        'string' => 'Поље :attribute мора имати :size карактера.',
        'numeric' => 'Поље :attribute мора бити :size.',
        'file' => 'Поље :attribute мора бити :size килобајта.',
        'array' => 'Поље :attribute мора садржати :size ставки.',
    ],
    'min' => [
        'string' => 'Поље :attribute мора имати најмање :min карактера.',
        'numeric' => 'Поље :attribute мора бити најмање :min.',
        'file' => 'Поље :attribute мора бити најмање :min килобајта.',
        'array' => 'Поље :attribute мора садржати најмање :min ставки.',
    ],
    'max' => [
        'string' => 'Поље :attribute не сме имати више од :max карактера.',
        'numeric' => 'Поље :attribute не сме бити веће од :max.',
        'file' => 'Поље :attribute не сме бити веће од :max килобајта.',
        'array' => 'Поље :attribute не сме садржати више од :max ставки.',
    ],
    'between' => [
        'string' => 'Поље :attribute мора имати између :min и :max карактера.',
        'numeric' => 'Поље :attribute мора бити између :min и :max.',
        'file' => 'Поље :attribute мора бити између :min и :max килобајта.',
        'array' => 'Поље :attribute мора садржати између :min и :max ставки.',
    ],
    'model_not_in_make' => 'Изабрани модел не припада изабраној марки.',
    'photo_order_mismatch' => 'Нови редослед мора да наведе сваку фотографију овог огласа тачно једном.',
    'radius_needs_origin' => 'Полупречник захтева координате или град од ког се мери.',
    'coordinates_need_both' => 'Географска ширина и дужина морају се навести заједно.',
    'city_not_in_country' => 'Изабрани град не припада изабраној држави.',
    'custom' => [
    ],
    'attributes' => [
        'phone' => 'број телефона',
        'phone_prefix' => 'позивни број',
        'code' => 'код',
        'display_name' => 'име',
        'preferred_language' => 'језик',
        'country_code' => 'држава',
        'city_id' => 'град',
        'seller_type' => 'тип продавца',
        'dealer_name' => 'назив ауто-плаца',
        'locale' => 'језик',
        'device_name' => 'уређај',
    ],
];
