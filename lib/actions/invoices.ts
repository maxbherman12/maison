'use server';

import { IdSchema } from '@/lib/validators/fields';
import { GenerateInvoiceSchema } from '@/lib/validators/invoices';
import type { ActionResult } from './result';
import { runAction } from './run-action';

export async function generateInvoice(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(({ invoices }) =>
    invoices.generate(GenerateInvoiceSchema.parse(input))
  );
}

export async function markInvoiceSent(id: unknown): Promise<ActionResult> {
  return runAction(({ invoices }) => invoices.markSent(IdSchema.parse(id)));
}

export async function markInvoicePaid(id: unknown): Promise<ActionResult> {
  return runAction(({ invoices }) => invoices.markPaid(IdSchema.parse(id)));
}
