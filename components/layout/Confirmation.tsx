import type { ReactNode } from 'react';

/**
 * The full-color moment after finishing a task. Buttons inside `footer` use
 * the inverted `onPaint` variants, since the whole screen is the paint.
 */
export function Confirmation({
  eyebrow,
  headline,
  detail,
  links,
  footer,
}: {
  eyebrow?: string;
  headline: ReactNode;
  detail: string;
  links?: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-primary text-primary-foreground motion-safe:animate-paint-up">
      <div className="flex flex-1 flex-col justify-center gap-3 px-7 pt-7 pb-3">
        {eyebrow && <p className="text-label opacity-90">{eyebrow}</p>}
        {headline}
        <p className="opacity-90">{detail}</p>
        {links && <div className="flex gap-5">{links}</div>}
      </div>
      <footer className="flex shrink-0 gap-2.5 px-5 pt-2.5 pb-[max(1.125rem,env(safe-area-inset-bottom))]">
        {footer}
      </footer>
    </div>
  );
}
