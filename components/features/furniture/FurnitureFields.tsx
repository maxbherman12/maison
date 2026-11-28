'use client';

import type { ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { centsToInput, dollarsToCents, formatMoney } from '@/lib/domain/money';
import {
  formatMarkup,
  furniturePriceCents,
  furniturePricing,
  marginCents,
  markupToInput,
  percentToBps,
  pricingLabel,
  type PricedPiece,
} from '@/lib/domain/pricing';
import { cn } from '@/lib/utils';
import {
  FURNITURE_STATUSES,
  FURNITURE_STATUS_LABELS,
  type FurnitureStatus,
} from '@/lib/domain/furniture';
import type { FurnitureFormValues } from '@/lib/validators/furniture';
import { TextAreaField, TextField } from '@/components/ui/form-field';

/** All four stages at once, so choosing one is a single tap. */
export function FurnitureStatusField() {
  const { register } = useFormContext<{ status: FurnitureStatus }>();

  return (
    <fieldset>
      <legend className="text-label text-muted-foreground">Status</legend>
      <div className="mt-1.5 grid grid-cols-4 border border-border">
        {FURNITURE_STATUSES.map((status) => (
          <label
            key={status}
            className="flex min-h-11 cursor-pointer items-center justify-center text-label transition-colors has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-foreground"
          >
            <input
              type="radio"
              value={status}
              className="sr-only"
              {...register('status')}
            />
            {FURNITURE_STATUS_LABELS[status]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FurniturePieceFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FurnitureFormValues>();

  return (
    <>
      <TextField label="Piece" {...register('name')} error={errors.name} />
      <TextField label="Vendor" {...register('vendor')} error={errors.vendor} />
    </>
  );
}

/** Reads a typed number, treating anything unparseable as blank. */
function typedNumber(value: string | undefined): number | null {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') return null;
  const number = Number(trimmed);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

type PriceValues = Pick<
  FurnitureFormValues,
  'trade' | 'markup' | 'clientPrice' | 'customMarkup' | 'customPrice' | 'excludeTrade'
>;

/** The piece as the form currently describes it, for live pricing. */
export function typedPiece(values: Partial<PriceValues>): PricedPiece {
  const markup = typedNumber(values.markup);
  const clientPrice = typedNumber(values.clientPrice);
  return {
    tradeCents: dollarsToCents(typedNumber(values.trade) ?? 0),
    markupBps: values.customMarkup && markup !== null ? percentToBps(markup) : null,
    clientPriceCents: values.customPrice && clientPrice !== null ? dollarsToCents(clientPrice) : null,
    excludeTrade: values.excludeTrade ?? false,
  };
}

/**
 * Trade, retail, markup, and client price, all filled in with real values.
 * The markup starts at the project's and the client price follows it until
 * the designer types their own; each can be reset back.
 */
export function FurniturePriceFields({
  projectMarkupBps,
}: {
  /** The project's markup, which an unchanged piece markup inherits. */
  projectMarkupBps: number;
}) {
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<FurnitureFormValues>();
  const values = useWatch({
    control,
    name: ['trade', 'markup', 'clientPrice', 'customMarkup', 'customPrice', 'excludeTrade'],
  });
  const [trade, markup, clientPrice, customMarkup, customPrice, excludeTrade] = values;
  const piece = typedPiece({ trade, markup, clientPrice, customMarkup, customPrice, excludeTrade });
  const pricing = furniturePricing(piece, projectMarkupBps);

  // Called from input handlers, not an effect: a price the designer has not
  // taken over keeps following trade and markup as they type.
  const followMarkup = () => {
    if (getValues('customPrice')) return;
    const current = typedPiece(getValues());
    setValue(
      'clientPrice',
      getValues('trade').trim() === ''
        ? ''
        : centsToInput(furniturePriceCents(current, projectMarkupBps))
    );
  };

  const resetMarkup = () => {
    setValue('markup', markupToInput(projectMarkupBps));
    setValue('customMarkup', false);
    followMarkup();
  };

  const resetPrice = () => {
    setValue('customPrice', false);
    followMarkup();
  };

  const moneyInput = { type: 'number', step: '0.01', inputMode: 'decimal' } as const;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Trade price"
          {...moneyInput}
          prefix="$"
          {...register('trade', { onChange: followMarkup })}
          error={errors.trade}
        />
        <TextField
          label="Retail price"
          {...moneyInput}
          prefix="$"
          {...register('retail')}
          error={errors.retail}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Read-only rather than disabled while the price is fixed, so the
            value survives and still submits; the fixed price wins over it. */}
        <TextField
          label="Markup (%)"
          {...moneyInput}
          min={0}
          readOnly={customPrice}
          className={cn(customPrice && 'opacity-40')}
          {...register('markup', {
            onChange: () => {
              setValue('customMarkup', true);
              followMarkup();
            },
          })}
          error={errors.markup}
        />
        <TextField
          label="Client price"
          {...moneyInput}
          prefix="$"
          {...register('clientPrice', {
            onChange: () => setValue('customPrice', true),
          })}
          error={errors.clientPrice}
        />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="size-4 shrink-0 rounded-none accent-primary"
          {...register('excludeTrade')}
        />
        <span>
          Exclude trade price
          <span className="block text-label text-muted-foreground">
            Check if the client paid the vendor
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-x-3 text-label text-muted-foreground tabular-nums">
        <p aria-live="polite">
          {piece.excludeTrade
            ? `Bill ${formatMoney(pricing.billedCents)} fee only`
            : `Margin ${formatMoney(marginCents(pricing.billedCents, pricing.costCents))}`}{' '}
          · {pricingLabel(pricing)}
        </p>
        {customPrice ? (
          <ResetButton onClick={resetPrice}>Use markup price</ResetButton>
        ) : (
          customMarkup &&
          pricing.markupBps !== projectMarkupBps && (
            <ResetButton onClick={resetMarkup}>
              Use project {formatMarkup(projectMarkupBps)}
            </ResetButton>
          )
        )}
      </div>
    </>
  );
}

function ResetButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-8 underline underline-offset-3 text-foreground"
    >
      {children}
    </button>
  );
}

export function FurnitureExtraFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FurnitureFormValues>();

  return (
    <>
      <TextField label="Link" {...register('link')} error={errors.link} />
      <TextField
        label="Tags, separated by commas"
        {...register('tags')}
        error={errors.tags}
      />
      <TextAreaField
        label="Notes"
        rows={2}
        {...register('notes')}
        error={errors.notes}
      />
    </>
  );
}

/** Every field on one screen, for editing a piece. */
export function FurnitureFields({ projectMarkupBps }: { projectMarkupBps: number }) {
  return (
    <>
      <FurniturePieceFields />
      <FurniturePriceFields projectMarkupBps={projectMarkupBps} />
      <FurnitureStatusField />
      <details>
        <summary className="flex min-h-8 cursor-pointer items-center text-label underline underline-offset-3">
          Link, tags and notes
        </summary>
        <div className="grid gap-2.5 pt-1">
          <FurnitureExtraFields />
        </div>
      </details>
    </>
  );
}
