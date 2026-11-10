import { AppShell } from '@/components/layout/AppShell';

export default function Loading() {
  return (
    <AppShell>
      <p role="status" className="py-10 text-center text-muted-foreground">
        Loading…
      </p>
    </AppShell>
  );
}
