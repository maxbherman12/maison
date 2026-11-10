/**
 * All money in Maison is integer cents. Dollars only exist at the edges: what
 * a person types into a form and what a formatter prints.
 */

const exact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const whole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** `$1,234.50`. Use wherever the figure is billed or compared. */
export function formatMoney(cents: number): string {
  return exact.format(cents / 100);
}

/** `$1,235`. Use only for at-a-glance figures such as tiles and cards. */
export function formatMoneyWhole(cents: number): string {
  return whole.format(cents / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** The value to pre-fill a money input with, such as `1234.50`. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function chargeForHours(hours: number, hourlyRateCents: number): number {
  return Math.round(hours * hourlyRateCents);
}

export function sumCents<T>(items: readonly T[], cents: (item: T) => number): number {
  return items.reduce((total, item) => total + cents(item), 0);
}
