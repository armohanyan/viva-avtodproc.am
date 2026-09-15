import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import DirectorFormActions from "./DirectorFormActions";
import { DirectorFormRow } from "./DirectorUi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  editing: boolean;
  createLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
};

export default function DirectorRecordFormDialog({
  open,
  onOpenChange,
  title,
  editing,
  createLabel,
  onSubmit,
  onCancel,
  children,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DirectorFormRow className="mt-2">{children}</DirectorFormRow>
        <DialogFooter className="mt-4 sm:justify-start">
          <DirectorFormActions
            editing={editing}
            createLabel={createLabel}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
