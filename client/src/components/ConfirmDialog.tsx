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
  return (
    <AppModal
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={title}
      description={description}
      contentClassName="max-w-sm"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant={danger ? "destructive" : "default"}
            className="flex-1"
            onClick={() => {
              void (async () => {
                await Promise.resolve(onConfirm());
                onClose();
              })();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    />
  );
}
