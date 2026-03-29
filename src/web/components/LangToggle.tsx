import { ChevronDown, Languages } from "lucide-react";
import { useLang, Lang } from "../lib/i18n";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const LANGS: { code: Lang; short: string; native: string }[] = [
  { code: "en", short: "EN", native: "English" },
  { code: "ru", short: "RU", native: "Русский" },
  { code: "am", short: "ՀՅ", native: "Հայերեն" },
];

export default function LangToggle() {
  const { lang, setLang, t } = useLang();
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 border-slate-200 px-2 font-semibold text-slate-700"
          aria-label={t("language")}
        >
          <Languages className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          <span className="min-w-[2rem] text-center text-xs tabular-nums">{current.short}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as Lang)}>
          {LANGS.map(({ code, short, native }) => (
            <DropdownMenuRadioItem key={code} value={code} className="cursor-pointer">
              <span className="flex w-full items-center justify-between gap-3 pr-1">
                <span className="font-medium">{short}</span>
                <span className="text-muted-foreground text-xs">{native}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
