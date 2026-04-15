"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import { cn } from "src/lib/utils";

export type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Merged into `DialogContent` (width, max-height overrides, etc.). */
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  showCloseButton?: boolean;
};

/**
 * Standard app dialog: fixed header, scrollable body, optional fixed footer.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  headerClassName,
  titleClassName,
  bodyClassName,
  footerClassName,
  showCloseButton = true,
}: AppModalProps) {
  const hasFooter = footer != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          contentClassName
        )}
      >
        <div
          className={cn(
            "shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14 text-left",
            headerClassName
          )}
        >
          <DialogHeader className="space-y-1.5 text-left sm:text-left">
            <DialogTitle className={cn("text-left", titleClassName)}>{title}</DialogTitle>
            {description != null && description !== "" ? (
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground">{description}</div>
              </DialogDescription>
            ) : null}
          </DialogHeader>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4",
            bodyClassName
          )}
        >
          {children}
        </div>
        {hasFooter ? (
          <div
            className={cn(
              "shrink-0 border-t border-border bg-background px-6 py-4",
              footerClassName
            )}
          >
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
