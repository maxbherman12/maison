import type { InvoiceLineItem, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { formatDate } from '@/lib/format-date';

interface InvoicePreviewProps {
  project: Project;
  lineItems: InvoiceLineItem[];
  issueDate: string;
}

export function InvoicePreview({
  project,
  lineItems,
  issueDate,
}: InvoicePreviewProps) {
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <article
      aria-label="Draft invoice preview"
      className="rounded-3xl border border-[#deddd5] bg-[#fffefa] p-5 shadow-[0_18px_50px_-35px_rgba(41,41,35,0.45)] sm:p-8 lg:p-10"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[#e9e7df] pb-6">
        <div>
          <p className="font-serif text-3xl tracking-tight">Maison</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
            Interior design
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center rounded-full bg-[#f1e6df] px-2.5 py-1 text-[11px] font-medium text-[#a9573d]">
            Draft
          </span>
          <p className="mt-2 text-sm font-medium">New invoice</p>
          <p className="text-xs text-[#85857a]">
            Issued {formatDate(issueDate)}
          </p>
        </div>
      </header>

      <div className="grid gap-6 border-b border-[#e9e7df] py-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
            Bill to
          </p>
          <p className="mt-2 text-lg font-medium">{project.client}</p>
          <p className="text-sm text-[#85857a]">{project.project}</p>
          {project.address && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-[#85857a]">
              {project.address}
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
            Payment terms
          </p>
          <p className="mt-2 text-sm text-[#292923]">
            Due date is set when the invoice is marked sent.
          </p>
          <p className="mt-1 text-xs text-[#85857a]">
            The final number is assigned on generation.
          </p>
        </div>
      </div>

      <div className="pt-6">
        {lineItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#deddd5] bg-[#fbfaf7] px-5 py-10 text-center">
            <p className="font-serif text-xl">No items selected</p>
            <p className="mt-1 text-sm text-[#85857a]">
              Choose at least one pending item to preview an invoice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Draft invoice line items
              </caption>
              <thead>
                <tr className="border-b border-[#e9e7df] text-[10px] uppercase tracking-[0.14em] text-[#99998e]">
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Description
                  </th>
                  <th
                    scope="col"
                    className="pb-3 pl-4 text-right font-medium"
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr
                    key={`${item.source}:${item.id}`}
                    className="border-b border-[#f0eee7] last:border-0"
                  >
                    <td className="py-3 pr-4 align-top">
                      <span className="block font-medium text-[#292923]">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] uppercase tracking-[0.1em] text-[#99998e]">
                        {item.source === 'hours' ? 'Hours' : 'Furniture'}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right align-top font-medium tabular-nums">
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-[#e9e7df] pt-5">
        <p className="max-w-[34ch] text-xs leading-relaxed text-[#85857a]">
          Amounts are recalculated from the selected source items when this
          invoice is generated.
        </p>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#99998e]">
            Total due
          </p>
          <p className="mt-1 font-serif text-3xl leading-none">
            {formatMoney(total)}
          </p>
        </div>
      </div>
    </article>
  );
}
