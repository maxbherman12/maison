import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Settings · Maison',
};

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Account
        </span>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          Profile, workspace, and billing preferences will live here. Nothing
          to configure yet — your account and menu bar work as usual.
        </p>
      </div>
    </AppShell>
  );
}
