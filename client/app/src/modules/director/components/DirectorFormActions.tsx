import { DirectorButton } from "./DirectorUi";

type Props = {
  editing: boolean;
  createLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function DirectorFormActions({ editing, createLabel, onSubmit, onCancel }: Props) {
  return (
    <div className="flex flex-wrap gap-2 self-start">
      <DirectorButton onClick={onSubmit}>{editing ? "Պահպանել" : createLabel}</DirectorButton>
      {editing ? (
        <DirectorButton variant="ghost" onClick={onCancel}>
          Չեղարկել
        </DirectorButton>
      ) : null}
    </div>
  );
}
