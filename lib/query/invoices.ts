'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/lib/types';
import { invoiceService } from '@/lib/services/container';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (projectId: string) => [...invoiceKeys.all, projectId] as const,
};

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
      items: { title: string; amount: number }[];
    }) => invoiceService.generateInvoice(input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.list(variables.project),
      });
      options?.onSuccess?.({ pathname: data.pathname ?? null });
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceService.markPaid(id),
    onSuccess: (invoice) => {
      if (invoice?.projectId) {
        queryClient.invalidateQueries({
          queryKey: invoiceKeys.list(invoice.projectId),
        });
      }
    },
  });
}

export type { Invoice };
