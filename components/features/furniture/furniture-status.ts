import {
  CircleCheck,
  Clock3,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { FurnitureStatus } from '@/lib/types';

export const FURNITURE_STATUS_ORDER = [
  'Pending',
  'Ordered',
  'In transit',
  'Delivered',
] as const satisfies readonly FurnitureStatus[];

interface StatusMeta {
  icon: LucideIcon;
  dot: string;
  tint: string;
  text: string;
  border: string;
}

export const FURNITURE_STATUS_META: Record<FurnitureStatus, StatusMeta> = {
  Pending: {
    icon: Clock3,
    dot: 'bg-[#bd765b]',
    tint: 'bg-[#f5e7e0]',
    text: 'text-[#a9573d]',
    border: 'border-[#bd765b]',
  },
  Ordered: {
    icon: ShoppingBag,
    dot: 'bg-[#b58a4a]',
    tint: 'bg-[#f4eddd]',
    text: 'text-[#8c6a34]',
    border: 'border-[#b58a4a]',
  },
  'In transit': {
    icon: Truck,
    dot: 'bg-[#6f8a9c]',
    tint: 'bg-[#e7eef2]',
    text: 'text-[#526b7b]',
    border: 'border-[#6f8a9c]',
  },
  Delivered: {
    icon: CircleCheck,
    dot: 'bg-[#7f8f72]',
    tint: 'bg-[#e9eee4]',
    text: 'text-[#5f6f53]',
    border: 'border-[#7f8f72]',
  },
};
