/**
 * The looks an invoice can take. Each style is a set of tokens, not a code
 * path: the on-screen invoice, the settings preview, and the PDF all read the
 * same tokens, so adding a style means adding one entry here.
 */
export interface InvoiceStyleTokens {
  /** Typeface of the letterhead (the business name). */
  letterheadFont: 'serif' | 'sans';
  letterheadAlign: 'left' | 'center';
  /** A stripe of the client's paint across the top. */
  accent: 'paint-bar' | 'none';
  /** Column headings as plain labels or reversed out of an ink band. */
  headings: 'plain' | 'band';
  /** Line items separated by whitespace or by a rule under each row. */
  rows: 'open' | 'ruled';
  /** Total under a single rule or inside a box. */
  total: 'line' | 'box';
}

export const INVOICE_STYLE_DEFINITIONS = {
  gallery: {
    label: 'Gallery',
    description: 'A stripe of the client’s paint and a serif letterhead.',
    tokens: {
      letterheadFont: 'serif',
      letterheadAlign: 'left',
      accent: 'paint-bar',
      headings: 'plain',
      rows: 'open',
      total: 'line',
    },
  },
  ledger: {
    label: 'Ledger',
    description: 'Classic and ruled, with an ink heading band.',
    tokens: {
      letterheadFont: 'sans',
      letterheadAlign: 'left',
      accent: 'none',
      headings: 'band',
      rows: 'ruled',
      total: 'box',
    },
  },
  atelier: {
    label: 'Atelier',
    description: 'A centered letterhead and plenty of white space.',
    tokens: {
      letterheadFont: 'serif',
      letterheadAlign: 'center',
      accent: 'none',
      headings: 'plain',
      rows: 'open',
      total: 'line',
    },
  },
} as const satisfies Record<
  string,
  { label: string; description: string; tokens: InvoiceStyleTokens }
>;

export type InvoiceStyle = keyof typeof INVOICE_STYLE_DEFINITIONS;

export const INVOICE_STYLES = Object.keys(INVOICE_STYLE_DEFINITIONS) as [
  InvoiceStyle,
  ...InvoiceStyle[],
];

export const DEFAULT_INVOICE_STYLE: InvoiceStyle = 'gallery';

export function invoiceStyleTokens(style: InvoiceStyle): InvoiceStyleTokens {
  return INVOICE_STYLE_DEFINITIONS[style].tokens;
}
