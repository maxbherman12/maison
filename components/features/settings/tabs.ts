/**
 * The settings sections. Kept out of the client form module so the server page
 * can read them: values exported from a 'use client' file are references there.
 */
export const SETTINGS_TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'invoices', label: 'Invoices' },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]['value'];

export function parseSettingsTab(value: string | undefined): SettingsTab {
  return SETTINGS_TABS.find((tab) => tab.value === value)?.value ?? 'profile';
}
