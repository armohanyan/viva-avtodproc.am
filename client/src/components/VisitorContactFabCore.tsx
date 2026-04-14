"use client";

import { useCallback, useMemo, useState, type ReactElement } from "react";
import { useMarketingPublic } from "src/modules/marketing/useMarketingPublic";
import { parseWhatsappDigits } from "src/modules/marketing/whatsappDigits";
import { FaWhatsapp } from "react-icons/fa";
import { Phone } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Textarea } from "src/components/ui/textarea";
import { apiFetch, apiV1Path, getApiErrorMessage } from "src/lib/api";
import { cn } from "src/lib/utils";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function whatsappUrl(e164Digits: string, message: string): string | null {
  const n = digitsOnly(e164Digits);
  if (!n) return null;
  const text = new URLSearchParams({ text: message }).toString();
  return `https://wa.me/${n}?${text}`;
}

function shouldHideFab(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/instructor") ||
    pathname.startsWith("/auth")
  );
}

export type VisitorContactFabCoreProps = {
  pathname: string;
};

export function VisitorContactFabCore({ pathname }: VisitorContactFabCoreProps): ReactElement | null {
  const { t } = useLang();
  const { showToast } = useToast();
  const { data: mkt } = useMarketingPublic();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const waRaw = useMemo(
    () => parseWhatsappDigits(mkt?.social?.whatsapp ?? "") ?? "",
    [mkt?.social?.whatsapp],
  );
  const waHref = useMemo(() => whatsappUrl(waRaw, t("whatsappPrefillMessage")), [waRaw, t]);

  const hidden = shouldHideFab(pathname);
  if (hidden) return null;

  const onSubmitCall = useCallback(async () => {
    const p = phone.trim();
    const s = slot.trim();
    if (p.length < 5) {
      showToast(t("bookCallErrPhone"), "error");
      return;
    }
    if (s.length < 3) {
      showToast(t("bookCallErrSlot"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(apiV1Path("/booked-calls"), {
        method: "POST",
        body: {
          name: name.trim() || null,
          phone: p,
          preferredTimeSlot: s,
          notes: notes.trim() || null,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      showToast(t("bookCallSuccess"), "success");
      setDialogOpen(false);
      setName("");
      setPhone("");
      setSlot("");
      setNotes("");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSubmitting(false);
    }
  }, [name, notes, phone, showToast, slot, t]);

  return (
    <>
      <div
        className={cn(
          "fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2",
          "max-[480px]:right-3 max-[480px]:bottom-3",
        )}
        aria-label={t("contact")}
      >
        <Button
          type="button"
          variant="secondary"
          className="h-11 rounded-full border bg-background px-4 shadow-md"
          onClick={() => setDialogOpen(true)}
        >
          <Phone className="size-4 shrink-0" aria-hidden />
          <span className="ml-2 max-w-[11rem] truncate text-sm font-medium">{t("fabBookCall")}</span>
        </Button>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("fabWhatsappAria")}
            className={cn(
              "flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg",
              "transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            )}
          >
            <FaWhatsapp className="size-8" aria-hidden />
          </a>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("bookCallDialogTitle")}</DialogTitle>
            <DialogDescription>{t("bookCallDialogHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="book-call-name">{t("bookCallNameOptional")}</Label>
              <Input
                id="book-call-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="book-call-phone">{t("bookCallPhone")}</Label>
              <Input
                id="book-call-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="book-call-slot">{t("bookCallTimeSlot")}</Label>
              <Textarea id="book-call-slot" value={slot} onChange={(e) => setSlot(e.target.value)} rows={3} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="book-call-notes">{t("bookCallNotesOptional")}</Label>
              <Textarea id="book-call-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void onSubmitCall()} disabled={submitting}>
              {t("bookCallSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
