import type { Metadata } from 'next';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Settings · Maison',
};

export default function SettingsPage() {
  return (
    <AppShell header={<AppHeader title="Settings" />}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Account
          </span>
          <h2 className="mt-2 font-serif text-3xl leading-tight">
            Settings are coming soon
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Profile, workspace, and billing preferences will live here. For now,
            your account and menu bar work as usual.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
