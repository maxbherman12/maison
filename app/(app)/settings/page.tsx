import type { Metadata } from 'next';
import { SettingsForm } from '@/components/features/settings/SettingsForm';
import { parseSettingsTab } from '@/components/features/settings/tabs';
import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth/session';
import { getServices } from '@/lib/services';

export const metadata: Metadata = {
  title: 'Settings · Maison',
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ settings }, user, { tab }] = await Promise.all([
    getServices(),
    requireUser(),
    searchParams,
  ]);

  return (
    <AppShell fill>
      <header className="mx-auto w-full max-w-3xl shrink-0 px-6 pt-3 md:pt-8">
        <span className="hidden text-label text-muted-foreground md:block">Account</span>
        <h1 className="font-serif text-name font-normal md:mt-1 md:text-heading">
          Settings
        </h1>
      </header>
      <SettingsForm
        profile={{ name: user.name, image: user.image ?? null }}
        settings={await settings.get()}
        initialTab={parseSettingsTab(tab)}
      />
    </AppShell>
  );
}
