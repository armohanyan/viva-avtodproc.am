import type { ReactNode } from "react";
import { ListFilter } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";
import { cn } from "src/lib/utils";

export type TableColumnFilterOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: TableColumnFilterOption[];
  ariaLabel: string;
  /** Value that means “no filter” (usually `"all"`). */
  allValue?: string;
  align?: "start" | "end" | "center";
  className?: string;
};

export default function TableColumnFilter({
  value,
  onChange,
  options,
  ariaLabel,
  allValue = "all",
  align = "start",
  className,
}: Props) {
  const active = value !== allValue;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
            active && "text-primary hover:text-primary bg-primary/10",
            className,
          )}
          aria-label={ariaLabel}
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[10rem]">
        <DropdownMenuLabel className="sr-only">{ariaLabel}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Header cell: title + optional column filter (keeps alignment in wide tables). */
export function TableColumnHeaderWithFilter({
  title,
  filter,
  className,
  align = "start",
}: {
  title: string;
  filter?: ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <th
      className={cn(
        "text-xs font-semibold text-muted-foreground px-4 py-3 tracking-wide whitespace-nowrap",
        align === "end" ? "text-right" : "text-left",
        className,
      )}
    >
      <div
        className={cn(
          "flex max-w-full min-w-0 items-center gap-1",
          align === "end" && "w-full justify-end",
        )}
      >
        <span className="min-w-0 truncate">{title}</span>
        {filter}
      </div>
    </th>
  );
}
