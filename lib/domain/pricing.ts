/**
 * What a client pays for a piece of furniture: trade plus a markup on trade
 * ("cost plus"), in integer basis points (2500 = 25%). Every step stays in
 * integers.
 *
 * Precedence, one rule: a fixed client price wins; otherwise the piece's own
 * markup; otherwise the project's markup.
 *
 * When the client paid the vendor directly (`excludeTrade`), the piece
 * bills only what sits above trade, never below zero, and costs the designer
 * nothing.
 */

/** 1000%. */
export const MAX_MARKUP_BPS = 100_000;

const BPS = 10_000;

/**
 * Trade plus markup, rounded half up to the cent once. The outstanding SQL in
 * `lib/services/projects.ts` uses the same integer expression, so both agree.
 */
export function markupPriceCents(tradeCents: number, markupBps: number): number {
  return Math.floor((tradeCents * (BPS + markupBps) + BPS / 2) / BPS);
}

export type PriceSource = 'fixed' | 'item' | 'project';

export interface FurniturePricing {
  /** The client price: the full value of the piece. */
  priceCents: number;
  /** What goes on the invoice: the client price, or only the markup if the client paid trade. */
  billedCents: number;
  /** What the designer paid: trade, or nothing if the client paid the vendor. */
  costCents: number;
  source: PriceSource;
  /** The markup applied, or null for a fixed price. */
  markupBps: number | null;
}

export interface PricedPiece {
  tradeCents: number;
  markupBps: number | null;
  clientPriceCents: number | null;
  /** True when the client paid the vendor, so only the markup is billed. */
  excludeTrade: boolean;
}

function billed(item: PricedPiece, priceCents: number) {
  return item.excludeTrade
    ? { billedCents: Math.max(priceCents - item.tradeCents, 0), costCents: 0 }
    : { billedCents: priceCents, costCents: item.tradeCents };
}

export function furniturePricing(
  item: PricedPiece,
  projectMarkupBps: number
): FurniturePricing {
  if (item.clientPriceCents !== null) {
    const priceCents = item.clientPriceCents;
    return { priceCents, ...billed(item, priceCents), source: 'fixed', markupBps: null };
  }
  const source = item.markupBps === null ? 'project' : 'item';
  const markupBps = item.markupBps ?? projectMarkupBps;
  const priceCents = markupPriceCents(item.tradeCents, markupBps);
  return { priceCents, ...billed(item, priceCents), source, markupBps };
}

export function furniturePriceCents(item: PricedPiece, projectMarkupBps: number): number {
  return furniturePricing(item, projectMarkupBps).priceCents;
}

export function furnitureBilledCents(item: PricedPiece, projectMarkupBps: number): number {
  return furniturePricing(item, projectMarkupBps).billedCents;
}

export function marginCents(priceCents: number, tradeCents: number): number {
  return priceCents - tradeCents;
}

/** `25%`, `27.5%`. */
export function formatMarkup(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`;
}

/** The value to pre-fill a percent input with, such as `27.5`. */
export function markupToInput(bps: number): string {
  return String(Number((bps / 100).toFixed(2)));
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/** How a price was reached, for the item sheet and the log confirmation. */
export function pricingLabel({ source, markupBps }: FurniturePricing): string {
  if (source === 'fixed' || markupBps === null) return 'a fixed price';
  return `${formatMarkup(markupBps)} markup`;
}
