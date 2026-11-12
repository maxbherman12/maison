'use server';

import { InvoiceStyleSchema, SettingsSchema } from '@/lib/validators/settings';
import type { ActionResult } from './result';
import { runAction } from './run-action';

export async function updateSettings(input: unknown): Promise<ActionResult> {
  return runAction(({ settings }) => settings.update(SettingsSchema.parse(input)));
}

export async function setInvoiceStyle(style: unknown): Promise<ActionResult> {
  return runAction(({ settings }) =>
    settings.setInvoiceStyle(InvoiceStyleSchema.parse(style))
  );
}
