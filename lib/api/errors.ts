import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors';

/**
 * Maps service and validation errors to JSON responses. Anything unexpected is
 * logged and returned as a generic 500 so internal details do not leak.
 */
export function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
