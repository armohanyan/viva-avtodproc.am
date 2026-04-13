import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";

type MultiSelectOption<T extends string> = {
  value: T;
  label: string;
};

type MultiSelectDropdownProps<T extends string> = {
  options: readonly MultiSelectOption<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  placeholder: string;
  ariaLabel?: string;
  maxVisibleLabels?: number;
};

export default function MultiSelectDropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxVisibleLabels = 2,
}: MultiSelectDropdownProps<T>) {
  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedLabels = useMemo(
    () => options.filter((option) => selectedSet.has(option.value)).map((option) => option.label),
    [options, selectedSet],
  );

  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= maxVisibleLabels
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, maxVisibleLabels).join(", ")} +${selectedLabels.length - maxVisibleLabels}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 justify-between border-input bg-background font-normal text-sm"
          aria-label={ariaLabel}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedSet.has(option.value)}
            onCheckedChange={(checked) => {
              const next = new Set(value);
              if (checked) next.add(option.value);
              else next.delete(option.value);
              onChange(Array.from(next));
            }}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
