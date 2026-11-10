'use client';

import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

/**
 * Thin styling layer over Base UI's Menu. Keeping the visual language here
 * means account, project, and future menus all share the same popup, item, and
 * separator treatment.
 */
function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />;
}

function DropdownMenuTrigger({ className, ...props }: Menu.Trigger.Props) {
  return <Menu.Trigger className={cn(className)} {...props} />;
}

interface DropdownMenuContentProps extends Menu.Positioner.Props {
  align?: Menu.Positioner.Props['align'];
}

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  children,
  ...props
}: DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        align={align}
        sideOffset={sideOffset}
        className="z-50 outline-none"
        {...props}
      >
        <Menu.Popup
          className={cn(
            'min-w-52 origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg shadow-foreground/5 outline-none transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const itemClassName =
  'flex cursor-default select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0';

function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return <Menu.Item className={cn(itemClassName, className)} {...props} />;
}

function DropdownMenuLinkItem({
  className,
  closeOnClick = true,
  ...props
}: Menu.LinkItem.Props) {
  return (
    <Menu.LinkItem
      closeOnClick={closeOnClick}
      className={cn(itemClassName, className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: Menu.Separator.Props) {
  return (
    <Menu.Separator
      className={cn('-mx-1.5 my-1.5 h-px bg-border', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
