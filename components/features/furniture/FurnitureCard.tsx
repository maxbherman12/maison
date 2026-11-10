import { ChevronRight, GripVertical } from 'lucide-react';
import { formatMoneyWhole } from '@/lib/domain/money';
import type { FurnitureItem } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_TAGS = 2;
const TAG_CLASS =
  'rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground';

/** The face of a piece on the board. Uses spans so it can sit inside a button. */
export function FurnitureCard({
  item,
  affordance,
}: {
  item: FurnitureItem;
  affordance: 'drag' | 'open' | 'overlay';
}) {
  const tags = item.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTags = item.tags.length - tags.length;

  return (
    <span
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_0_rgba(41,41,35,0.04)] transition-colors',
        affordance !== 'overlay' && 'group-hover/card:border-foreground/20'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {item.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {item.vendor || 'No vendor'}
        </span>
        {tags.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <span key={`${tag}-${index}`} className={TAG_CLASS}>
                {tag}
              </span>
            ))}
            {hiddenTags > 0 && <span className={TAG_CLASS}>+{hiddenTags}</span>}
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-serif text-sm text-foreground">
          {formatMoneyWhole(item.tradeCents)}
        </span>
        {affordance === 'drag' && (
          <GripVertical className="size-3.5 text-muted-foreground/60 opacity-0 transition-opacity group-hover/card:opacity-100" />
        )}
        {affordance === 'open' && (
          <ChevronRight className="size-4 text-muted-foreground/60" />
        )}
      </span>
    </span>
  );
}
