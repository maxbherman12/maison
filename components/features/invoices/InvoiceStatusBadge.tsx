import type { InvoiceStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Issued: 'bg-[#ece9e0] text-[#6b564a]',
  Sent: 'bg-[#dde3e6] text-[#4f6068]',
  Paid: 'bg-[#dbe1d4] text-[#5b6753]',
  Overdue: 'bg-[#f1dcd4] text-[#a9573d]',
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight tracking-wide',
        STATUS_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}
