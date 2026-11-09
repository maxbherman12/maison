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
import { useSessionUserId, userScopedKey } from '@/lib/query/session';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (projectId: string) => [...invoiceKeys.lists(), projectId] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (invoiceId: string) => [...invoiceKeys.details(), invoiceId] as const,
};

function invalidateInvoice(
  queryClient: QueryClient,
  invoice: Pick<Invoice, 'id' | 'projectId'>,
  userId: string | null
) {
  queryClient.invalidateQueries({
    queryKey: userScopedKey(userId, invoiceKeys.list(invoice.projectId)),
  });
  queryClient.invalidateQueries({
    queryKey: userScopedKey(userId, invoiceKeys.detail(invoice.id)),
  });
  // Billing items changes the pending grid and the project list outstanding
  // figures, so refresh both.
  queryClient.invalidateQueries({
    queryKey: userScopedKey(userId, projectKeys.detail(invoice.projectId)),
  });
  queryClient.invalidateQueries({
    queryKey: userScopedKey(userId, projectKeys.lists()),
  });
}

export function useInvoices(projectId: string, initialData?: Invoice[]) {
  const userId = useSessionUserId();

  return useQuery({
    queryKey: userScopedKey(userId, invoiceKeys.list(projectId)),
    queryFn: async () =>
      (await apiRequest(
        `/api/invoices?projectId=${encodeURIComponent(projectId)}`
      )) as Invoice[],
    enabled: !!projectId && !!userId,
    initialData,
  });
}

export function useInvoice(invoiceId: string, initialData?: Invoice) {
  const userId = useSessionUserId();

  return useQuery({
    queryKey: userScopedKey(userId, invoiceKeys.detail(invoiceId)),
    queryFn: async () =>
      (await apiRequest(`/api/invoices/${invoiceId}`)) as Invoice,
    enabled: !!invoiceId && !!userId,
    initialData,
  });
}

export function useGenerateInvoice(options?: {
  onSuccess?: (invoice: Invoice) => void;
}) {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (input: GenerateInvoiceInput) =>
      apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(input),
      }) as Promise<Invoice>,
    onSuccess: (invoice) => {
      invalidateInvoice(queryClient, invoice, userId);
      options?.onSuccess?.(invoice);
    },
  });
}

export function useMarkInvoiceSent() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'send' }),
      }) as Promise<Invoice>,
    onSuccess: (invoice) => {
      invalidateInvoice(queryClient, invoice, userId);
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'pay' }),
      }) as Promise<Invoice>,
    onSuccess: (invoice) => {
      invalidateInvoice(queryClient, invoice, userId);
    },
  });
}

export type { Invoice } from '@/lib/types';
