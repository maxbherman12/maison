import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Settings · Maison',
};

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="w-full max-w-3xl md:mx-auto">
        <span className="text-label text-muted-foreground">
          Account
        </span>
        <h1 className="mt-1 font-serif text-heading font-normal">
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
