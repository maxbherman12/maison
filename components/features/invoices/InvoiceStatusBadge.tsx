import type { InvoiceStatus } from '@/lib/domain/invoices';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  Issued: 'neutral',
  Sent: 'info',
  Paid: 'success',
  Overdue: 'danger',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{status}</Badge>;
}
