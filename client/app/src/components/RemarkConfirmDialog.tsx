import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { AppModal } from "./AppModal";
import { useLang } from "src/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (remark: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  remarkLabel?: string;
  remarkPlaceholder?: string;
  danger?: boolean;
  minRemarkLength?: number;
}

export default function RemarkConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  remarkLabel,
  remarkPlaceholder,
  danger = false,
  minRemarkLength = 3,
}: Props) {
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);
  const [remark, setRemark] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirming(false);
      setRemark("");
      setTouched(false);
    }
  }, [open]);

  const trimmed = remark.trim();
  const remarkValid = trimmed.length >= minRemarkLength;
  const showError = touched && !remarkValid;

  return (
    <AppModal
      open={open}
      onOpenChange={(o) => {
        if (!o && !confirming) onClose();
      }}
      title={title}
      description={description}
      contentClassName="max-w-md"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" disabled={confirming} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant={danger ? "destructive" : "default"}
            className="flex-1"
            disabled={confirming || !remarkValid}
            onClick={() => {
              setTouched(true);
              if (!remarkValid) return;
              void (async () => {
                setConfirming(true);
                try {
                  await Promise.resolve(onConfirm(trimmed));
                  onClose();
                } catch {
                  /* parent may rethrow after toast; keep dialog open */
                } finally {
                  setConfirming(false);
                }
              })();
            }}
          >
            {confirming ? <Loader2 className="size-4 animate-spin mx-auto" aria-hidden /> : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="archive-remark">{remarkLabel ?? t("adminArchiveRemarkLabel")}</Label>
        <Textarea
          id="archive-remark"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={remarkPlaceholder ?? t("adminArchiveRemarkPlaceholder")}
          rows={4}
          disabled={confirming}
          className={showError ? "border-destructive" : undefined}
        />
        {showError ? (
          <p className="text-destructive text-xs">{t("adminArchiveRemarkRequired")}</p>
        ) : (
          <p className="text-muted-foreground text-xs">{t("adminArchiveRemarkHint")}</p>
        )}
      </div>
    </AppModal>
  );
}
