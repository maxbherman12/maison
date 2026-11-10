/** Fulfilment stages in board order. The one list of furniture statuses. */
export const FURNITURE_STATUSES = [
  'Pending',
  'Ordered',
  'In transit',
  'Delivered',
] as const;

export type FurnitureStatus = (typeof FURNITURE_STATUSES)[number];

export function isFurnitureStatus(value: unknown): value is FurnitureStatus {
  return FURNITURE_STATUSES.includes(value as FurnitureStatus);
}
