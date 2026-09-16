<?php

declare(strict_types=1);

use App\Contracts\ExchangeRateProvider;
use App\Models\ExchangeRate;
use App\Support\Rates\HttpExchangeRateProvider;
use Database\Seeders\ExchangeRateSeeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    $this->seed(ExchangeRateSeeder::class);
});

it('writes the rates the provider returns', function (): void {
    $this->app->instance(ExchangeRateProvider::class, new class implements ExchangeRateProvider
    {
        public function ratesPerEuro(array $currencies): array
        {
            return ['ALL' => '98.500000', 'MKD' => '61.700000', 'RSD' => '117.400000', 'BGN' => '1.955830'];
        }
    });

    $this->artisan('rates:refresh')
        ->expectsOutputToContain('Refreshed 4 exchange rates.')
        ->assertSuccessful();

    expect(ExchangeRate::query()->find('ALL')->rate_per_eur)->toBe('98.500000')
        ->and(ExchangeRate::query()->find('MKD')->rate_per_eur)->toBe('61.700000')
        // The euro is not fetched; Kosovo uses it and it is always one.
        ->and(ExchangeRate::query()->find('EUR')->rate_per_eur)->toBe('1.000000');
});

it('clears the cached rates endpoint so apps stop converting at yesterday numbers', function (): void {
    $this->getJson('/api/v1/exchange-rates')->assertOk();

    expect(Cache::get('reference:exchange-rates'))->not->toBeNull();

    $this->app->instance(ExchangeRateProvider::class, new class implements ExchangeRateProvider
    {
        public function ratesPerEuro(array $currencies): array
        {
            return ['ALL' => '97.000000'];
        }
    });

    $this->artisan('rates:refresh')->assertSuccessful();

    expect(Cache::get('reference:exchange-rates'))->toBeNull();

    $this->getJson('/api/v1/exchange-rates')
        ->assertOk()
        ->assertJsonFragment(['currency' => 'ALL', 'rate_per_eur' => '97.000000']);
});

it('leaves the seeded rates alone when no provider is configured', function (): void {
    config()->set('rates.driver', 'none');

    $this->artisan('rates:refresh')
        ->expectsOutputToContain('Refreshed 0 exchange rates.')
        ->assertSuccessful();

    expect(ExchangeRate::query()->find('ALL')->rate_per_eur)->toBe('100.500000');
});

it('reports a provider that fails without losing the rates it already has', function (): void {
    $this->app->instance(ExchangeRateProvider::class, new class implements ExchangeRateProvider
    {
        public function ratesPerEuro(array $currencies): array
        {
            throw new RuntimeException('provider is down');
        }
    });

    $this->artisan('rates:refresh')->assertFailed();

    expect(ExchangeRate::query()->find('ALL')->rate_per_eur)->toBe('100.500000');
});

it('reads rates from a JSON endpoint', function (): void {
    config()->set('rates.http.url', 'https://rates.example.com/latest');
    config()->set('rates.http.key', 'secret-key');

    Http::fake([
        'rates.example.com/*' => Http::response([
            'base' => 'EUR',
            'rates' => ['ALL' => 98.5, 'MKD' => 61.7, 'RSD' => 117.4, 'BGN' => 1.95583],
        ]),
    ]);

    $rates = (new HttpExchangeRateProvider)->ratesPerEuro(['ALL', 'MKD', 'RSD', 'BGN']);

    expect($rates)->toBe([
        'ALL' => '98.500000',
        'MKD' => '61.700000',
        'RSD' => '117.400000',
        'BGN' => '1.955830',
    ]);

    Http::assertSent(fn ($request): bool => str_contains($request->url(), 'symbols=ALL%2CMKD%2CRSD%2CBGN')
        && str_contains($request->url(), 'base=EUR'));
});

it('keeps the currencies a provider did return when one is missing', function (): void {
    config()->set('rates.http.url', 'https://rates.example.com/latest');

    Http::fake([
        'rates.example.com/*' => Http::response([
            'rates' => ['ALL' => 98.5, 'MKD' => 'nonsense', 'RSD' => 0, 'BGN' => 1.95583],
        ]),
    ]);

    $rates = (new HttpExchangeRateProvider)->ratesPerEuro(['ALL', 'MKD', 'RSD', 'BGN']);

    expect($rates)->toBe(['ALL' => '98.500000', 'BGN' => '1.955830']);
});

it('refuses to trust an endpoint that answers with an error', function (): void {
    config()->set('rates.http.url', 'https://rates.example.com/latest');

    Http::fake(['rates.example.com/*' => Http::response([], 500)]);

    expect(fn () => (new HttpExchangeRateProvider)->ratesPerEuro(['ALL']))
        ->toThrow(RuntimeException::class);
});
