import { Plus } from "lucide-react";
import { Button } from "src/components/ui/button";

type Props = {
  onClick: () => void;
  label?: string;
};

export default function DirectorAddRecordButton({ onClick, label = "Ավելացնել" }: Props) {
  return (
    <Button type="button" size="sm" onClick={onClick} className="gap-1.5 shrink-0">
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
