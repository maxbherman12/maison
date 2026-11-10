/** A small labelled figure, used in the summary strips on invoice pages. */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted px-3 py-2.5">
      <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <strong className="mt-0.5 block truncate font-serif text-base font-normal sm:text-lg">
        {value}
      </strong>
    </div>
  );
}
