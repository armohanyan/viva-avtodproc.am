import type { ComponentProps, ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "src/lib/utils";
import { useLang } from "src/lib/i18n";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "src/components/ui/context-menu";

export type AdminTableRowAction =
  | {
      kind: "item";
      id: string;
      label: string;
      ariaLabel?: string;
      title?: string;
      icon?: LucideIcon;
      destructive?: boolean;
      onClick: () => void;
    }
  | {
      kind: "link";
      id: string;
      label: string;
      ariaLabel?: string;
      title?: string;
      icon?: LucideIcon;
      href: string;
    }
  | { kind: "separator"; id: string };

function AdminTableRowActionsMenuContent({ actions }: { actions: AdminTableRowAction[] }) {
  const [, setLocation] = useLocation();
  return (
    <ContextMenuContent className="min-w-[10rem]">
      {actions.map((a) => {
        if (a.kind === "separator") {
          return <ContextMenuSeparator key={a.id} />;
        }
        const Icon = a.icon;
        if (a.kind === "link") {
          return (
            <ContextMenuItem key={a.id} className="gap-2" onSelect={() => setLocation(a.href)}>
              {Icon ? <Icon className="w-4 h-4" /> : null}
              {a.label}
            </ContextMenuItem>
          );
        }
        return (
          <ContextMenuItem
            key={a.id}
            variant={a.destructive ? "destructive" : "default"}
            className="gap-2"
            onSelect={() => a.onClick()}
          >
            {Icon ? <Icon className="w-4 h-4" /> : null}
            {a.label}
          </ContextMenuItem>
        );
      })}
    </ContextMenuContent>
  );
}

/** Wrap a table row so right-click anywhere on the row opens the same menu as the actions column. */
export function AdminTableRowContextMenu({
  actions,
  children,
}: {
  actions: AdminTableRowAction[];
  children: ReactElement<ComponentProps<"tr">>;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <AdminTableRowActionsMenuContent actions={actions} />
    </ContextMenu>
  );
}

type Props = {
  actions: AdminTableRowAction[];
  /** Merged onto the toolbar wrapper inside the context trigger */
  className?: string;
  /** icon = compact icon buttons; text = underlined text links */
  presentation?: "icon" | "text";
  /** When true, only the action buttons/links render (row-level {@link AdminTableRowContextMenu} supplies the menu). */
  toolbarOnly?: boolean;
};

export default function AdminTableRowActions({
  actions,
  className,
  presentation = "icon",
  toolbarOnly = false,
}: Props) {
  const { t } = useLang();

  const toolbar = (
    <div
      className={cn(
        presentation === "icon" ? "flex items-center gap-2 flex-wrap" : "inline-flex flex-wrap items-center gap-x-3 gap-y-1",
        className,
      )}
      aria-label={t("actions")}
    >
      {actions.map((a) => {
        if (a.kind === "separator") {
          return <span key={a.id} className="w-px h-4 bg-border mx-0.5 shrink-0" aria-hidden />;
        }
        const aria = a.ariaLabel ?? a.label;
        const titleAttr = a.title ?? a.label;
        const Icon = a.icon;

        if (a.kind === "link") {
          return (
            <Link
              key={a.id}
              href={a.href}
              className={cn(
                presentation === "icon"
                  ? "p-1.5 rounded-md hover:bg-primary/10 text-primary inline-flex shrink-0"
                  : "text-primary hover:underline text-xs",
              )}
              title={titleAttr}
              aria-label={aria}
            >
              {Icon ? <Icon className="w-3.5 h-3.5" /> : a.label}
            </Link>
          );
        }

        return (
          <button
            key={a.id}
            type="button"
            className={cn(
              presentation === "icon"
                ? cn(
                    "p-1.5 rounded-md inline-flex shrink-0",
                    a.destructive ? "hover:bg-red-50 text-red-500" : "hover:bg-primary/10 text-primary",
                  )
                : cn("text-xs", a.destructive ? "text-red-500 hover:underline" : "text-primary hover:underline"),
            )}
            onClick={a.onClick}
            aria-label={aria}
            title={titleAttr}
          >
            {Icon ? <Icon className="w-3.5 h-3.5" /> : a.label}
          </button>
        );
      })}
    </div>
  );

  if (toolbarOnly) {
    return toolbar;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{toolbar}</ContextMenuTrigger>
      <AdminTableRowActionsMenuContent actions={actions} />
    </ContextMenu>
  );
}
