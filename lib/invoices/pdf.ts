import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import { BILLABLE_KIND_LABELS, type BillableKind } from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import { formatInvoiceNumber } from '@/lib/domain/invoices';
import { formatMoney } from '@/lib/domain/money';

export interface InvoicePdfInput {
  number: number;
  issuedAt: Date;
  clientName: string;
  projectName: string;
  address: string;
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
const ROW_HEIGHT = 24;
const BOTTOM = MARGIN + 28;
const AMOUNT_COLUMN_WIDTH = 100;

const INK = rgb(0.16, 0.16, 0.14);
const MUTED = rgb(0.45, 0.45, 0.41);
const RULE = rgb(0.87, 0.87, 0.84);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
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
  color = INK
) {
  const safe = encodable(text, font);
  page.drawText(safe, {
    x: RIGHT - font.widthOfTextAtSize(safe, size),
    y,
    size,
    font,
    color,
  });
}

function drawRule(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT, y },
    thickness: 0.75,
    color: RULE,
  });
}

function drawHeader(page: PDFPage, input: InvoicePdfInput, fonts: Fonts): number {
  const top = PAGE.height - MARGIN - 22;
  drawLeft(page, 'Maison', top, fonts.bold, 22);
  drawRight(page, `Invoice ${formatInvoiceNumber(input.number)}`, top + 6, fonts.bold, 13);
  drawRight(page, `Issued ${formatDate(input.issuedAt)}`, top - 10, fonts.regular, 10, MUTED);

  let y = top - 48;
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

function drawColumnHeadings(page: PDFPage, y: number, fonts: Fonts): number {
  drawLeft(page, 'DESCRIPTION', y, fonts.bold, 8, MUTED);
  drawRight(page, 'AMOUNT', y, fonts.bold, 8, MUTED);
  drawRule(page, y - 8);
  return y - 26;
}

/** Renders a complete, paginated invoice. Pure: same input, same document. */
export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${formatInvoiceNumber(input.number)}`);

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const addPage = () => pdf.addPage([PAGE.width, PAGE.height]);
  const continuationTop = PAGE.height - MARGIN;

  let page = addPage();
  let y = drawColumnHeadings(page, drawHeader(page, input, fonts), fonts);

  for (const item of input.lineItems) {
    if (y < BOTTOM) {
      page = addPage();
      y = drawColumnHeadings(page, continuationTop, fonts);
    }

    const label = `${item.title}  (${BILLABLE_KIND_LABELS[item.kind]})`;
    drawLeft(
      page,
      label,
      y,
      fonts.regular,
      11,
      INK,
      MARGIN,
      RIGHT - MARGIN - AMOUNT_COLUMN_WIDTH
    );
    drawRight(page, formatMoney(item.amountCents), y, fonts.regular, 11);
    y -= ROW_HEIGHT;
  }

  if (y < BOTTOM + 24) {
    page = addPage();
    y = continuationTop - 24;
  }

  drawRule(page, y + 10);
  drawRight(page, `Total due  ${formatMoney(input.totalCents)}`, y - 12, fonts.bold, 14);

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
