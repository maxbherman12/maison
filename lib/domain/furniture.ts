/** Fulfilment stages in board order. The one list of furniture statuses. */
export const FURNITURE_STATUSES = [
  'Pending',
  'Ordered',
  'In transit',
  'Delivered',
] as const;

export type FurnitureStatus = (typeof FURNITURE_STATUSES)[number];

export const FURNITURE_STATUS_LABELS: Record<FurnitureStatus, string> = {
  Pending: 'To order',
  Ordered: 'Ordered',
  'In transit': 'In transit',
  Delivered: 'Delivered',
};
