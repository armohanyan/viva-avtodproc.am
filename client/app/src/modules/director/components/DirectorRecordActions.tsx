import { DirectorButton } from "./DirectorUi";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
};

export default function DirectorRecordActions({ onEdit, onDelete, readOnly }: Props) {
  if (readOnly) {
    return <span className="text-xs text-muted-foreground">Հին տվյալ</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 justify-end">
      <DirectorButton variant="ghost" size="sm" onClick={onEdit}>
        Խմբագրել
      </DirectorButton>
      <DirectorButton variant="ghost" size="sm" onClick={onDelete}>
        Ջնջել
      </DirectorButton>
    </div>
  );
}
