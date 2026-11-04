import type { InvoiceStatus } from '@/lib/types';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  Issued: 'neutral',
  Sent: 'info',
  Paid: 'success',
  Overdue: 'danger',
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
    <Badge tone={STATUS_TONES[status]} className={className}>
      {status}
    </Badge>
  );
}
