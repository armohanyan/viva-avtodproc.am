import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "src/lib/utils";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";
import { addDirectorOption, fetchDirectorOptions } from "src/modules/director/director.api";
import type { DirectorOptionCategory } from "src/modules/director/director.types";
import { directorSelectTriggerClass } from "./DirectorUi";

type Props = {
  category: DirectorOptionCategory;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
};

export default function DirectorDynamicSelect({ category, value, onChange, allowEmpty }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDirectorOptions(category);
      setOptions(Array.isArray(rows) ? rows : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    const trimmed = newValue.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      const rows = await addDirectorOption(category, trimmed);
      setOptions(rows);
      onChange(trimmed);
      setNewValue("");
      setOpen(false);
    } finally {
      setAdding(false);
    }
  };

  const displayValue = value || (allowEmpty ? "—" : "Ընտրել");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button
          type="button"
          className={cn(directorSelectTriggerClass, "flex items-center justify-between gap-2 text-left")}
        >
          <span className={cn("truncate", !value && allowEmpty && "text-muted-foreground")}>{displayValue}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-48 overflow-y-auto p-1">
          {allowEmpty ? (
            <DropdownMenuItem onSelect={() => onChange("")} className="justify-between">
              —
              {!value ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          ) : null}
          {options.map((opt) => (
            <DropdownMenuItem key={opt} onSelect={() => onChange(opt)} className="justify-between">
              <span className="truncate">{opt}</span>
              {value === opt ? <Check className="h-4 w-4 shrink-0" /> : null}
            </DropdownMenuItem>
          ))}
        </div>
        <div
          className="flex gap-1.5 border-t border-border p-2"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Input
            placeholder="Նոր տարբերակ"
            value={newValue}
            disabled={adding}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAdd();
              }
            }}
            className="h-8"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 px-2.5"
            disabled={adding || !newValue.trim()}
            onClick={() => void handleAdd()}
            aria-label="Ավելացնել"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
