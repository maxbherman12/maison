'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldErrors } from 'react-hook-form';
import { Check } from 'lucide-react';
import { updateSettings } from '@/lib/actions/settings';
import { useAction } from '@/lib/actions/use-action';
import { centsToInput } from '@/lib/domain/money';
import { invoiceIssuer } from '@/lib/domain/settings';
import type { AccountSettings } from '@/lib/domain/types';
import {
  SettingsSchema,
  type SettingsFormValues,
} from '@/lib/validators/settings';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/form-field';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { InvoiceStylePicker } from './InvoiceStylePicker';
import { SETTINGS_TABS, type SettingsTab } from './tabs';


/** Which tab each field lives on, so a failed save can show the problem. */
const FIELD_TABS: Record<keyof SettingsFormValues, SettingsTab> = {
  name: 'profile',
  companyName: 'profile',
  businessAddress: 'profile',
  businessEmail: 'profile',
  businessPhone: 'profile',
  defaultHourlyRate: 'profile',
  paymentTermsDays: 'invoices',
  paymentNote: 'invoices',
};

function toFormValues(name: string, settings: AccountSettings): SettingsFormValues {
  return {
    name,
    companyName: settings.companyName,
    businessAddress: settings.businessAddress,
    businessEmail: settings.businessEmail,
    businessPhone: settings.businessPhone,
    defaultHourlyRate:
      settings.defaultHourlyRateCents === null
        ? ''
        : centsToInput(settings.defaultHourlyRateCents),
    paymentTermsDays: String(settings.paymentTermsDays),
    paymentNote: settings.paymentNote,
  };
}

/**
 * Profile (with business details) and invoice settings as one form split
 * across tabs. Every panel stays mounted, so one Save sends all of it. The
 * invoice style is the exception: it saves the moment it is chosen.
 *
 * Viewport-first: the tabs stay put, only the active panel scrolls, and the
 * save bar appears at the bottom only while there is something to save.
 */
export function SettingsForm({
  profile,
  settings,
  initialTab,
}: {
  profile: { name: string; image: string | null };
  settings: AccountSettings;
  initialTab: SettingsTab;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [justSaved, setJustSaved] = useState(false);
  const { run, pending, error } = useAction();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema, undefined, { raw: true }),
    defaultValues: toFormValues(profile.name, settings),
  });
  const { register, watch, formState: { errors, isDirty } } = form;

  const [name, companyName, businessAddress, businessEmail, businessPhone] = watch([
    'name',
    'companyName',
    'businessAddress',
    'businessEmail',
    'businessPhone',
  ]);
  const issuer = invoiceIssuer(
    {
      companyName: companyName ?? '',
      businessAddress: businessAddress ?? '',
      businessEmail,
      businessPhone: businessPhone ?? '',
    },
    name.trim() || profile.name
  );

  const showFirstError = (fieldErrors: FieldErrors<SettingsFormValues>) => {
    const first = SETTINGS_TABS.find(({ value }) =>
      Object.keys(fieldErrors).some(
        (field) => FIELD_TABS[field as keyof SettingsFormValues] === value
      )
    );
    if (first) setTab(first.value);
  };

  const save = form.handleSubmit(
    (values) =>
      run(
        () => updateSettings(values),
        () => {
          form.reset(values);
          setJustSaved(true);
        }
      ),
    showFirstError
  );

  const panel = (value: SettingsTab) => ({
    role: 'tabpanel',
    id: `settings-panel-${value}`,
    'aria-labelledby': `settings-tab-${value}`,
    hidden: tab !== value,
    className: 'mx-auto grid w-full max-w-3xl gap-4 px-6 pt-5 pb-8',
  });

  const showFooter = isDirty || pending || justSaved || Boolean(error);

  return (
    <form
      onSubmit={save}
      onChange={() => setJustSaved(false)}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="mx-auto w-full max-w-3xl shrink-0 px-6 pt-1 md:pt-4">
        <SegmentedTabs
          ariaLabel="Settings sections"
          idPrefix="settings"
          value={tab}
          items={SETTINGS_TABS}
          onChange={setTab}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div {...panel('profile')}>
          <div className="hidden items-center gap-4 md:flex">
            {profile.image ? (
              // A plain img: Google avatars are tiny, and next/image would need a remote allowlist.
              <img
                src={profile.image}
                alt=""
                referrerPolicy="no-referrer"
                className="size-14 shrink-0 object-cover"
              />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center bg-primary font-serif text-name text-primary-foreground">
                {(name.trim() || profile.name).charAt(0).toUpperCase()}
              </span>
            )}
            <p className="min-w-0 truncate font-serif text-name">
              {name.trim() || profile.name}
            </p>
          </div>
          <TextField
            label="Your name"
            autoComplete="name"
            {...register('name')}
            error={errors.name}
          />
          <TextField
            label="Company name"
            placeholder={profile.name}
            hint="Your invoice letterhead. Leave blank to use your name."
            autoComplete="organization"
            {...register('companyName')}
            error={errors.companyName}
          />
          <TextAreaField
            label="Business address"
            rows={2}
            placeholder="Optional"
            autoComplete="street-address"
            {...register('businessAddress')}
            error={errors.businessAddress}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Email"
              type="email"
              placeholder="Optional"
              autoComplete="email"
              {...register('businessEmail')}
              error={errors.businessEmail}
            />
            <TextField
              label="Phone"
              type="tel"
              placeholder="Optional"
              autoComplete="tel"
              {...register('businessPhone')}
              error={errors.businessPhone}
            />
          </div>
          <TextField
            label="Default hourly rate"
            type="number"
            step="0.01"
            inputMode="decimal"
            prefix="$"
            placeholder="Optional"
            hint="Filled in when you start a new project."
            {...register('defaultHourlyRate')}
            error={errors.defaultHourlyRate}
          />
        </div>

        <div {...panel('invoices')}>
          <InvoiceStylePicker value={settings.invoiceStyle} from={issuer} />
          <TextField
            label="Payment due after (days)"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            hint="Counted from the day you mark an invoice sent."
            {...register('paymentTermsDays')}
            error={errors.paymentTermsDays}
          />
          <TextAreaField
            label="Payment note"
            rows={2}
            placeholder="e.g. Checks payable to Studio Vance · Zelle hello@studio.com"
            hint="Printed at the foot of every new invoice."
            {...register('paymentNote')}
            error={errors.paymentNote}
          />
        </div>
      </div>

      {showFooter && (
        <footer className="shrink-0 border-t border-border bg-background motion-safe:animate-rise">
          <div className="mx-auto w-full max-w-3xl px-6 py-3">
            {error && <Alert className="mb-3">{error}</Alert>}
            <div className="flex items-center justify-between gap-4">
              <span aria-live="polite" className="inline-flex items-center gap-1 text-label text-muted-foreground">
                {isDirty ? (
                  'Unsaved changes'
                ) : justSaved ? (
                  <>
                    <Check className="size-3.5" aria-hidden="true" />
                    Changes saved
                  </>
                ) : null}
              </span>
              <Button type="submit" size="lg" disabled={pending || !isDirty}>
                {pending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </footer>
      )}
    </form>
  );
}
