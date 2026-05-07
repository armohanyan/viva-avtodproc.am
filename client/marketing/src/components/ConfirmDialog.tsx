import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { AppModal } from "./AppModal";
import { useLang } from "src/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", danger = false }: Props) {
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) setConfirming(false);
  }, [open]);

  return (
    <AppModal
      open={open}
      onOpenChange={(o) => {
        if (!o && !confirming) onClose();
      }}
      title={title}
      description={description}
      contentClassName="max-w-sm"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" disabled={confirming} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant={danger ? "destructive" : "default"}
            className="flex-1"
            disabled={confirming}
            onClick={() => {
              void (async () => {
                setConfirming(true);
                try {
                  await Promise.resolve(onConfirm());
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
      <></>
    </AppModal>
  );
}
