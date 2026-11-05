'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { Invoice, GenerateInvoiceInput } from '@/lib/types';
import { apiRequest } from '@/lib/api/client';
import { projectKeys } from '@/lib/query/projects';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (projectId: string) => [...invoiceKeys.lists(), projectId] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (invoiceId: string) => [...invoiceKeys.details(), invoiceId] as const,
};

function invalidateInvoice(
  queryClient: QueryClient,
  invoice: Pick<Invoice, 'id' | 'projectId'>
) {
  queryClient.invalidateQueries({ queryKey: invoiceKeys.list(invoice.projectId) });
  queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoice.id) });
  // Billing items changes the pending grid and the project list outstanding
  // figures, so refresh both.
  queryClient.invalidateQueries({
    queryKey: projectKeys.detail(invoice.projectId),
  });
  queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
}

export function useInvoices(projectId: string, initialData?: Invoice[]) {
  return useQuery({
    queryKey: invoiceKeys.list(projectId),
    queryFn: async () =>
      (await apiRequest(
        `/api/invoices?projectId=${encodeURIComponent(projectId)}`
      )) as Invoice[],
    enabled: !!projectId,
    initialData,
  });
}

export function useInvoice(invoiceId: string, initialData?: Invoice) {
  return useQuery({
    queryKey: invoiceKeys.detail(invoiceId),
    queryFn: async () =>
      (await apiRequest(`/api/invoices/${invoiceId}`)) as Invoice,
    enabled: !!invoiceId,
    initialData,
  });
}

export function useGenerateInvoice(options?: {
  onSuccess?: (invoice: Invoice) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateInvoiceInput) =>
      apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(input),
      }) as Promise<Invoice>,
    onSuccess: (invoice) => {
      invalidateInvoice(queryClient, invoice);
      options?.onSuccess?.(invoice);
    },
  });
}

export function useMarkInvoiceSent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'send' }),
      }) as Promise<Invoice>,
    onSuccess: (invoice) => {
      invalidateInvoice(queryClient, invoice);
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'pay' }),
      }) as Promise<Invoice>,
    onSuccess: (invoice) => {
      invalidateInvoice(queryClient, invoice);
    },
  });
}

export type { Invoice } from '@/lib/types';
