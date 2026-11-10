import {
  CircleCheck,
  Clock3,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { FurnitureStatus } from '@/lib/domain/furniture';
import type { BadgeTone } from '@/components/ui/badge';

interface StatusMeta {
  icon: LucideIcon;
  tone: BadgeTone;
  dot: string;
  tint: string;
  text: string;
  border: string;
}

export const FURNITURE_STATUS_META: Record<FurnitureStatus, StatusMeta> = {
  Pending: {
    icon: Clock3,
    tone: 'brand',
    dot: 'bg-tone-brand-dot',
    tint: 'bg-tone-brand-bg',
    text: 'text-tone-brand-fg',
    border: 'border-primary',
  },
  Ordered: {
    icon: ShoppingBag,
    tone: 'warning',
    dot: 'bg-tone-warning-dot',
    tint: 'bg-tone-warning-bg',
    text: 'text-tone-warning-fg',
    border: 'border-tone-warning-dot',
  },
  'In transit': {
    icon: Truck,
    tone: 'info',
    dot: 'bg-tone-info-dot',
    tint: 'bg-tone-info-bg',
    text: 'text-tone-info-fg',
    border: 'border-tone-info-dot',
  },
  Delivered: {
    icon: CircleCheck,
    tone: 'success',
    dot: 'bg-tone-success-dot',
    tint: 'bg-tone-success-bg',
    text: 'text-tone-success-fg',
    border: 'border-tone-success-dot',
  },
};
