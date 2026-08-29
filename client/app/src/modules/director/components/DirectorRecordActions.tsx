import { DirectorButton } from "./DirectorUi";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
};

export default function DirectorRecordActions({ onEdit, onDelete }: Props) {
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
