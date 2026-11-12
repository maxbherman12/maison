import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  type RGB,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import { BILLABLE_KIND_LABELS, type BillableKind } from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import {
  invoiceStyleTokens,
  type InvoiceStyle,
  type InvoiceStyleTokens,
} from '@/lib/domain/invoice-styles';
import { formatInvoiceNumber } from '@/lib/domain/invoices';
import { formatMoney } from '@/lib/domain/money';
import type { InvoiceIssuer } from '@/lib/domain/settings';

export interface InvoicePdfInput {
  number: number;
  issuedAt: Date;
  style: InvoiceStyle;
  from: InvoiceIssuer;
  clientName: string;
  projectName: string;
  address: string;
  paymentNote: string;
  /** The client's paint as `#rrggbb`, used by styles with a paint accent. */
  accentColor: string;
  totalCents: number;
  lineItems: readonly {
    kind: BillableKind;
    title: string;
    amountCents: number;
  }[];
}

const PAGE = { width: 612, height: 792 };
const MARGIN = 54;
const RIGHT = PAGE.width - MARGIN;
const CENTER = PAGE.width / 2;
const ROW_HEIGHT = 24;
const BOTTOM = MARGIN + 28;
const AMOUNT_COLUMN_WIDTH = 100;
const TOTAL_BOX_WIDTH = 230;
/** Room kept clear of the left letterhead for the invoice number. */
const LETTERHEAD_RESERVE = 180;

const INK = rgb(0.16, 0.16, 0.14);
const MUTED = rgb(0.45, 0.45, 0.41);
const RULE = rgb(0.87, 0.87, 0.84);
const PAPER = rgb(1, 1, 1);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  serif: PDFFont;
}

/** Everything a drawing step needs about the document being built. */
interface Context {
  input: InvoicePdfInput;
  tokens: InvoiceStyleTokens;
  fonts: Fonts;
}

/**
 * The standard PDF fonts only cover Latin text, and pdf-lib throws on anything
 * else. A title with an emoji must not be able to block an invoice, so
 * unsupported characters are replaced instead.
 */
function encodable(text: string, font: PDFFont): string {
  const supported = new Set(font.getCharacterSet());

  return Array.from(text.replace(/[‍️]/g, ''))
    .map((char) => {
      if (/\s/.test(char)) return ' ';
      return supported.has(char.codePointAt(0)!) ? char : '?';
    })
    .join('');
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  let end = text.length;
  while (end > 0 && font.widthOfTextAtSize(`${text.slice(0, end)}...`, size) > maxWidth) {
    end -= 1;
  }
  return `${text.slice(0, end).trimEnd()}...`;
}

/** Breaks text into encodable lines no wider than `maxWidth`, keeping its own line breaks. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  return text.split('\n').flatMap((paragraph) => {
    const words = encodable(paragraph, font).split(' ').filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.map((current) => fit(current, font, size, maxWidth));
  });
}

function hexToRgb(hex: string): RGB {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function drawLeft(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
  x = MARGIN,
  maxWidth = RIGHT - x
) {
  page.drawText(fit(encodable(text, font), font, size, maxWidth), {
    x,
    y,
    size,
    font,
    color,
  });
}

function drawRight(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
  right = RIGHT
) {
  const safe = encodable(text, font);
  page.drawText(safe, {
    x: right - font.widthOfTextAtSize(safe, size),
    y,
    size,
    font,
    color,
  });
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK
) {
  const safe = fit(encodable(text, font), font, size, RIGHT - MARGIN);
  page.drawText(safe, {
    x: CENTER - font.widthOfTextAtSize(safe, size) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawRule(page: PDFPage, y: number, color = RULE) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT, y },
    thickness: 0.75,
    color,
  });
}

/** Letterhead, sender details, and invoice number. Returns the next baseline. */
function drawLetterhead(page: PDFPage, { input, tokens, fonts }: Context): number {
  const number = `Invoice ${formatInvoiceNumber(input.number)}`;
  const issued = `Issued ${formatDate(input.issuedAt)}`;
  const details = input.from.details.split('\n').filter(Boolean);
  const letterhead = tokens.letterheadFont === 'serif' ? fonts.serif : fonts.bold;

  if (tokens.accent === 'paint-bar') {
    page.drawRectangle({
      x: 0,
      y: PAGE.height - 10,
      width: PAGE.width,
      height: 10,
      color: hexToRgb(input.accentColor),
    });
  }

  // The business name is never shortened: it wraps onto as many lines as it needs.
  if (tokens.letterheadAlign === 'center') {
    let y = PAGE.height - MARGIN - 26;
    wrap(input.from.name, letterhead, 30, RIGHT - MARGIN).forEach((line, index) => {
      if (index > 0) y -= 32;
      drawCentered(page, line, y, letterhead, 30);
    });
    if (details.length > 0) {
      y -= 20;
      drawCentered(page, details.join('  ·  '), y, fonts.regular, 9, MUTED);
    }
    y -= 26;
    drawCentered(page, `${number}  ·  ${issued}`.toUpperCase(), y, fonts.bold, 8, MUTED);
    return y - 40;
  }

  const top = PAGE.height - MARGIN - 22;
  const nameWidth = RIGHT - MARGIN - LETTERHEAD_RESERVE;
  drawRight(page, number, top + 6, fonts.bold, 13);
  drawRight(page, issued, top - 10, fonts.regular, 10, MUTED);

  let y = top;
  wrap(input.from.name, letterhead, 22, nameWidth).forEach((line, index) => {
    if (index > 0) y -= 24;
    page.drawText(line, { x: MARGIN, y, size: 22, font: letterhead, color: INK });
  });

  y -= 4;
  for (const line of details) {
    y -= 13;
    drawLeft(page, line, y, fonts.regular, 9, MUTED, MARGIN, nameWidth);
  }
  return Math.min(y, top - 10) - 34;
}

function drawBillTo(page: PDFPage, y: number, { input, fonts }: Context): number {
  drawLeft(page, 'BILL TO', y, fonts.bold, 8, MUTED);
  y -= 18;
  drawLeft(page, input.clientName, y, fonts.bold, 13);
  y -= 16;
  drawLeft(page, input.projectName, y, fonts.regular, 11, MUTED);

  for (const line of input.address.split('\n').filter((part) => part.trim())) {
    y -= 14;
    drawLeft(page, line, y, fonts.regular, 10, MUTED);
  }

  return y - 28;
}

function drawColumnHeadings(page: PDFPage, y: number, { tokens, fonts }: Context): number {
  if (tokens.headings === 'band') {
    page.drawRectangle({
      x: MARGIN,
      y: y - 7,
      width: RIGHT - MARGIN,
      height: 20,
      color: INK,
    });
    drawLeft(page, 'DESCRIPTION', y, fonts.bold, 8, PAPER, MARGIN + 8);
    drawRight(page, 'AMOUNT', y, fonts.bold, 8, PAPER, RIGHT - 8);
    return y - 28;
  }

  drawLeft(page, 'DESCRIPTION', y, fonts.bold, 8, MUTED);
  drawRight(page, 'AMOUNT', y, fonts.bold, 8, MUTED);
  drawRule(page, y - 8);
  return y - 26;
}

function drawTotal(page: PDFPage, y: number, { input, tokens, fonts }: Context) {
  const amount = formatMoney(input.totalCents);

  if (tokens.total === 'box') {
    const left = RIGHT - TOTAL_BOX_WIDTH;
    page.drawRectangle({
      x: left,
      y: y - 22,
      width: TOTAL_BOX_WIDTH,
      height: 34,
      borderColor: INK,
      borderWidth: 1,
    });
    drawLeft(page, 'TOTAL DUE', y - 9, fonts.bold, 8, MUTED, left + 12);
    drawRight(page, amount, y - 10, fonts.bold, 14, INK, RIGHT - 12);
    return;
  }

  drawRule(page, y + 10, tokens.letterheadAlign === 'center' ? INK : RULE);
  drawRight(page, `Total due  ${amount}`, y - 12, fonts.bold, 14);
}

/** Renders a complete, paginated invoice. Pure: same input, same document. */
export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${formatInvoiceNumber(input.number)}`);

  const ctx: Context = {
    input,
    tokens: invoiceStyleTokens(input.style),
    fonts: {
      regular: await pdf.embedFont(StandardFonts.Helvetica),
      bold: await pdf.embedFont(StandardFonts.HelveticaBold),
      serif: await pdf.embedFont(StandardFonts.TimesRoman),
    },
  };
  const { fonts, tokens } = ctx;
  const inset = tokens.headings === 'band' ? 8 : 0;

  const addPage = () => pdf.addPage([PAGE.width, PAGE.height]);
  const continuationTop = PAGE.height - MARGIN;

  let page = addPage();
  let y = drawColumnHeadings(page, drawBillTo(page, drawLetterhead(page, ctx), ctx), ctx);

  for (const item of input.lineItems) {
    if (y < BOTTOM) {
      page = addPage();
      y = drawColumnHeadings(page, continuationTop, ctx);
    }

    const label = `${item.title}  (${BILLABLE_KIND_LABELS[item.kind]})`;
    drawLeft(
      page,
      label,
      y,
      fonts.regular,
      11,
      INK,
      MARGIN + inset,
      RIGHT - MARGIN - AMOUNT_COLUMN_WIDTH
    );
    drawRight(page, formatMoney(item.amountCents), y, fonts.regular, 11, INK, RIGHT - inset);
    if (tokens.rows === 'ruled') drawRule(page, y - 9);
    y -= ROW_HEIGHT;
  }

  if (y < BOTTOM + 24) {
    page = addPage();
    y = continuationTop - 24;
  }

  drawTotal(page, y, ctx);
  y -= 64;

  const note = wrap(input.paymentNote.trim(), fonts.regular, 10, RIGHT - MARGIN);
  if (note.length > 0) {
    if (y - note.length * 14 < BOTTOM) {
      page = addPage();
      y = continuationTop - 12;
    }
    drawLeft(page, 'PAYMENT', y, fonts.bold, 8, MUTED);
    for (const line of note) {
      y -= 14;
      page.drawText(line, { x: MARGIN, y, size: 10, font: fonts.regular, color: INK });
    }
  }

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    drawRight(
      current,
      `${formatInvoiceNumber(input.number)}  ·  Page ${index + 1} of ${pages.length}`,
      MARGIN - 18,
      fonts.regular,
      9,
      MUTED
    );
  });

  return pdf.save();
}
