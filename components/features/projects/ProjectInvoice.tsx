'use client';

import { useMemo, useState } from 'react';
import { FileText, X } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/types';
import { buildInvoiceLineItems } from '@/lib/billing';
import { useGenerateInvoice } from '@/lib/query/invoices';

interface ProjectInvoiceProps {
  project: Project;
  onBack: () => void;
}

export function ProjectInvoice({ project, onBack }: ProjectInvoiceProps) {
  const [generated, setGenerated] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const generateInvoice = useGenerateInvoice({
    onSuccess: (data) => {
      setInvoiceId(data.id);
      setGenerated(true);
    },
  });

  // The invoice bills exactly what the pending items grid shows.
  const lineItems = useMemo(() => buildInvoiceLineItems(project), [project]);
  const total = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.amount, 0),
    [lineItems]
  );

  const handleGenerate = () => {
    generateInvoice.mutate({
      projectId: project.id,
      client: project.client,
      project: project.project,
      total,
      items: lineItems,
    });
  };

  if (generateInvoice.isPending) {
    return (
      <div className="mx-auto max-w-2xl py-10 flex flex-col items-center justify-center">
        <p className="text-sm text-[#85857a]">Generating invoice...</p>
      </div>
    );
  }

  if (generateInvoice.error) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <p className="text-destructive">
          Failed to generate invoice. Please try again.
        </p>
        <Button onClick={handleGenerate} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {generated && invoiceId ? (
        <div className="animate-in fade-in zoom-in duration-300">
          <div className="mt-8 rounded-2xl border border-[#deddd5] bg-[#fbfaf7] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl">Invoice generated</h2>
              <button
                onClick={() => {
                  setGenerated(false);
                  setInvoiceId(null);
                }}
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-[#85857a]">
              Your PDF invoice has been generated and saved.
            </p>
            <div className="mt-6">
              <a
                href={`/api/invoices/${invoiceId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#bd765b] hover:underline"
              >
                <FileText className="size-4" /> View invoice
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-6 font-serif text-4xl">Invoices</h1>
          <p className="mt-2 text-sm text-[#85857a]">
            Generate a PDF invoice for <strong>{project.client}</strong>.
          </p>
          <div className="mt-10 rounded-2xl border border-[#deddd5] bg-[#fbfaf7] p-6">
            <p className="text-sm text-[#85857a]">
              Total due:{' '}
              <span className="font-serif text-xl">{formatMoney(total)}</span>
            </p>
            <p className="mt-1 text-sm text-[#85857a]">
              Line items: {lineItems.length} pending{' '}
              {lineItems.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="mt-8">
            <Button
              onClick={handleGenerate}
              className="w-full rounded-xl bg-[#bd765b] text-white"
              disabled={generateInvoice.isPending || lineItems.length === 0}
            >
              {lineItems.length === 0 ? 'Nothing to invoice' : 'Generate invoice'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
