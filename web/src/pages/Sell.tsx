import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { referenceApi } from '../api/reference';
import { sellApi, type ListingDraftInput } from '../api/sell';
import type { Listing } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Button, Card, Chip, EmptyState, Field, Input, Select, Spinner } from '../components/ui';

const FUELS = ['diesel', 'petrol', 'hybrid', 'electric', 'lpg'];
const GEARBOXES = ['manual', 'automatic'];
const YEARS = Array.from({ length: 40 }, (_, at) => new Date().getFullYear() - at);

/** What the API enforces on publish: at least four photographs, at most 15. */
const MIN_PHOTOS = 4;
const MAX_PHOTOS = 15;

/**
 * Selling a car, from a keyboard.
 *
 * The app asks one thing per screen because a phone can hold one thing. A
 * desktop can hold the lot, and a seller with a keyboard would rather tab down
 * a form than tap Next eleven times — so this is one page with the same
 * questions in the same order, against the same endpoints.
 *
 * The draft is still saved as it goes, which is what makes closing the tab
 * survivable: the listing exists on the server from the moment the make is
 * chosen, and `?draft=` picks it back up. Nothing about that is the browser's
 * own idea of a listing.
 *
 * Publishing spends a credit, exactly as it does on the phone. Credits cannot
 * be bought here — both stores require that to happen inside the app — so a
 * seller at zero is told where to go rather than shown a button that fails.
 */
export function Sell() {
  const { t } = useTranslation(['sell', 'listing', 'search', 'common', 'web', 'profile', 'auth']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();

  const [draft, setDraft] = useState<Listing | null>(null);
  const [form, setForm] = useState<ListingDraftInput>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const makes = useQuery({ queryKey: ['makes'], queryFn: referenceApi.makes, staleTime: 3_600_000 });
  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries, staleTime: 3_600_000 });

  // The seller's own country unless they say otherwise. A city belongs to one
  // country and the API refuses a pair that does not match, so the list has to
  // narrow with the choice rather than offer every town in the region.
  const country = form.country_code ?? user?.country_code ?? 'MK';

  const cities = useQuery({
    queryKey: ['cities', country],
    queryFn: () => referenceApi.cities(country),
    staleTime: 3_600_000,
  });
  const vocab = useQuery({ queryKey: ['vocabularies'], queryFn: referenceApi.vocabularies, staleTime: 3_600_000 });
  const models = useQuery({
    queryKey: ['models', form.make_id],
    queryFn: () => referenceApi.models(form.make_id as number),
    enabled: form.make_id !== undefined,
    staleTime: 3_600_000,
  });

  // Resuming a draft started on the phone, or here before the tab closed.
  const resuming = params.get('draft');

  useEffect(() => {
    if (!resuming) {
      return;
    }

    void sellApi.show(resuming).then((listing) => {
      setDraft(listing);
      setForm({
        make_id: listing.make?.id,
        model_id: listing.model?.id ?? null,
        variant: listing.variant,
        year: listing.year ?? undefined,
        mileage_km: listing.mileage_km ?? undefined,
        fuel: listing.fuel ?? undefined,
        transmission: listing.transmission ?? undefined,
        body_type: listing.body_type,
        price_eur: listing.price_eur ? Number(listing.price_eur) : undefined,
        price_negotiable: listing.price_negotiable,
        customs_cleared: listing.customs_cleared ?? undefined,
        description: listing.description,
        features: listing.features,
        country_code: listing.country_code ?? undefined,
        city_id: listing.city?.id,
      });
    });
  }, [resuming]);

  /** Creates the listing on the first save and updates it on every one after. */
  const save = useMutation({
    mutationFn: async (patch: ListingDraftInput) => {
      const next = { ...form, ...patch };

      setForm(next);

      const listing = draft
        ? await sellApi.updateDraft(draft.id, patch)
        : await sellApi.createDraft(next);

      setDraft(listing);

      // Picking a model gives the draft the shape that range is usually built
      // in. It is the API's guess and the seller may change it, but a form
      // showing "Not set" for something the server has already decided is a
      // form lying about the listing.
      if (next.body_type == null && listing.body_type) {
        setForm({ ...next, body_type: listing.body_type });
      }

      return listing;
    },
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const listing = draft ?? (await sellApi.createDraft(form));

      setDraft(listing);

      return sellApi.uploadPhotos(listing.id, files);
    },
    onSuccess: async () => {
      if (draft) {
        setDraft(await sellApi.show(draft.id));
      }

      setPhotos([]);
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!draft) {
        throw new Error('no draft');
      }

      // Everything on the form, then publish — so nothing typed and not
      // blurred is lost between the last save and the spend.
      await sellApi.updateDraft(draft.id, form);

      return sellApi.publish(draft.id);
    },
    onSuccess: (listing) => {
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
      navigate(`/listing/${listing.id}`);
    },
    onError: (problem) => {
      if (problem instanceof ApiError) {
        // The 422 names what is still missing, so the form can point at it.
        setMissing(problem.body.missing ?? []);
        setError(problem.message);
      } else {
        setError(t('common:error_loading'));
      }
    },
  });

  if (!user) {
    return (
      <div className="page">
        <EmptyState
          heading
          title={t('sell:guest_title')}
          description={t('sell:guest_body')}
          actionLabel={t('common:sign_in')}
          onAction={() => navigate('/sign-in')}
        />
      </div>
    );
  }

  const shot = (field: string) => (missing.includes(field) ? t('sell:missing') : null);
  const uploaded = draft?.photos ?? [];

  return (
    <div className="page legal sellpage">
      <h1>{t('sell:new_listing')}</h1>
      <p className="muted">{t('sell:publish_note')}</p>

      <Card className="legal__card">
        <h2 className="detail__h2">{t('search:make_model')}</h2>
        <div className="sell__grid">
          <Field label={t('search:make')} error={shot('make_id')}>
            <Select
              value={form.make_id ?? ''}
              onChange={(event) =>
                save.mutate({
                  make_id: event.target.value ? Number(event.target.value) : undefined,
                  model_id: null,
                })
              }
            >
              <option value="">{t('sell:not_set')}</option>
              {(makes.data ?? []).map((make) => (
                <option key={make.id} value={make.id}>
                  {make.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('search:model')} error={shot('model_id')}>
            <Select
              value={form.model_id ?? ''}
              disabled={form.make_id === undefined}
              onChange={(event) => save.mutate({ model_id: event.target.value ? Number(event.target.value) : null })}
            >
              <option value="">{t('sell:not_set')}</option>
              {(models.data ?? []).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('sell:variant')}>
            <Input
              defaultValue={form.variant ?? ''}
              placeholder={t('sell:variant_placeholder')}
              onBlur={(event) => save.mutate({ variant: event.target.value.trim() || null })}
            />
          </Field>

          <Field label={t('listing:body')}>
            <Select
              value={form.body_type ?? ''}
              onChange={(event) => save.mutate({ body_type: event.target.value || null })}
            >
              <option value="">{t('sell:not_set')}</option>
              {(vocab.data?.body_types ?? []).map((key) => (
                <option key={key} value={key}>
                  {t(`listing:body_type.${key}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <h2 className="detail__h2 sell__h">{t('search:condition')}</h2>
        <div className="sell__grid">
          <Field label={t('listing:year')} error={shot('year')}>
            <Select
              value={form.year ?? ''}
              onChange={(event) => save.mutate({ year: event.target.value ? Number(event.target.value) : undefined })}
            >
              <option value="">{t('sell:not_set')}</option>
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('listing:mileage')} error={shot('mileage_km')}>
            <Input
              type="number"
              inputMode="numeric"
              defaultValue={form.mileage_km ?? ''}
              onBlur={(event) => save.mutate({ mileage_km: event.target.value ? Number(event.target.value) : undefined })}
            />
          </Field>

          <Field label={t('listing:fuel_label')} error={shot('fuel')}>
            <Select value={form.fuel ?? ''} onChange={(event) => save.mutate({ fuel: event.target.value || undefined })}>
              <option value="">{t('sell:not_set')}</option>
              {FUELS.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {t(`listing:fuel.${fuel}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('listing:transmission_label')} error={shot('transmission')}>
            <Select
              value={form.transmission ?? ''}
              onChange={(event) => save.mutate({ transmission: event.target.value || undefined })}
            >
              <option value="">{t('sell:not_set')}</option>
              {GEARBOXES.map((box) => (
                <option key={box} value={box}>
                  {t(`listing:transmission.${box}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <h2 className="detail__h2 sell__h">{t('sell:photos')}</h2>
        <p className="subtle">{t('sell:photos_hint', { min: MIN_PHOTOS, max: MAX_PHOTOS })}</p>

        <div className="sell__photos">
          {uploaded.map((photo) => (
            <div key={photo.id} className="sell__photo">
              <img src={photo.thumb_url ?? photo.url} alt="" />
              <button
                type="button"
                aria-label={t('sell:remove_photo')}
                onClick={async () => {
                  if (draft) {
                    await sellApi.deletePhoto(draft.id, photo.id);
                    setDraft(await sellApi.show(draft.id));
                  }
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
        />

        <div className="legal__actions sell__upload">
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            {t('sell:add_photos')}
          </Button>
          {photos.length > 0 ? (
            <Button loading={upload.isPending} onClick={() => upload.mutate(photos)}>
              {t('sell:photos_count', { count: photos.length, max: MAX_PHOTOS })}
            </Button>
          ) : null}
        </div>
        {missing.includes('photos') ? <p className="field__error">{t('sell:photos_hint', { min: MIN_PHOTOS, max: MAX_PHOTOS })}</p> : null}

        <h2 className="detail__h2 sell__h">{t('search:price')}</h2>
        <div className="sell__grid">
          <Field label={t('search:price')} error={shot('price_eur')}>
            <Input
              type="number"
              inputMode="numeric"
              defaultValue={form.price_eur ?? ''}
              onBlur={(event) => save.mutate({ price_eur: event.target.value ? Number(event.target.value) : undefined })}
            />
          </Field>

          {/* One open market means one option, so the chooser only earns its
              place once a second country is flipped on. */}
          {(countries.data ?? []).length > 1 ? (
            <Field label={t('auth:country_label')}>
              <Select
                value={country}
                onChange={(event) => save.mutate({ country_code: event.target.value, city_id: undefined })}
              >
                {(countries.data ?? []).map((row) => (
                  <option key={row.code} value={row.code}>
                    {t(`search:country.${row.code}`)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label={t('search:location')} error={shot('city_id')}>
            <Select
              value={form.city_id ?? ''}
              onChange={(event) =>
                save.mutate({
                  country_code: country,
                  city_id: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            >
              <option value="">{t('sell:not_set')}</option>
              {(cities.data ?? []).map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="sell__checks">
          <label className="sell__check">
            <input
              type="checkbox"
              checked={form.price_negotiable ?? false}
              onChange={(event) => save.mutate({ price_negotiable: event.target.checked })}
            />
            {t('listing:negotiable')}
          </label>
          <label className="sell__check">
            <input
              type="checkbox"
              checked={form.customs_cleared ?? false}
              onChange={(event) => save.mutate({ customs_cleared: event.target.checked })}
            />
            {t('listing:customs')}
          </label>
        </div>

        <h2 className="detail__h2 sell__h">{t('listing:description')}</h2>
        <textarea
          className="input sell__text"
          rows={5}
          defaultValue={form.description ?? ''}
          placeholder={t('sell:description_placeholder')}
          onBlur={(event) => save.mutate({ description: event.target.value.trim() || null })}
        />

        <h2 className="detail__h2 sell__h">{t('listing:features')}</h2>
        <div className="chips">
          {(vocab.data?.features ?? []).map((key) => {
            const on = (form.features ?? []).includes(key);

            return (
              <Chip
                key={key}
                label={t(`listing:feature.${key}`)}
                selected={on}
                onClick={() =>
                  save.mutate({
                    features: on
                      ? (form.features ?? []).filter((item) => item !== key)
                      : [...(form.features ?? []), key],
                  })
                }
              />
            );
          })}
        </div>

        {error ? <p className="field__error sell__h">{error}</p> : null}

        <div className="legal__actions sell__publish">
          <Button size="lg" loading={publish.isPending} disabled={!draft} onClick={() => publish.mutate()}>
            {t('sell:publish')}
          </Button>
          <span className="subtle">{t('sell:credits_balance', { count: user.credits })}</span>
        </div>

        {user.credits === 0 ? <p className="subtle">{t('web:credits_app_only')}</p> : null}
        {save.isPending ? <Spinner /> : null}
      </Card>
    </div>
  );
}
