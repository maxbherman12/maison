'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@/lib/query/projects';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (projectId: string) => [...invoiceKeys.all, projectId] as const,
};

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useGenerateInvoice(options?: {
  onSuccess?: (data: { pathname: string | null }) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      projectId: string;
      client: string;
      project: string;
      total: number;
      items: {
        id: string;
        source: 'hours' | 'furniture';
        title: string;
        amount: number;
      }[];
    }) =>
      request('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.list(variables.projectId),
      });
      // Billing items clears them from the outstanding grid, so refresh the project.
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      options?.onSuccess?.({ pathname: data.pathname ?? null });
    },
  });
}

export type { Invoice } from '@/lib/types';
