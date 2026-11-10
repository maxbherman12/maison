import 'server-only';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors';
import { getServices, type Services } from '@/lib/services';
import type { ActionResult } from './result';

/**
 * The shape of every mutation: authenticate, do the work, refresh the UI.
 *
 * Authentication sits outside the `try` so its redirect to sign-in reaches
 * Next. Errors a person can act on become messages; anything else is logged
 * and reported generically so internals never reach the browser.
 */
export async function runAction<T>(
  work: (services: Services) => Promise<T>
): Promise<ActionResult<T>> {
  const services = await getServices();

  try {
    const data = await work(services);
    revalidatePath('/', 'layout');
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' };
    }
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }

    console.error('[action] unexpected failure', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
