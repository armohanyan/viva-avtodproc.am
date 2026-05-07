import type { Instructor } from "src/data/instructors";

type Props = {
  label: string;
  instructors: readonly Instructor[];
  valueName: string;
  onChangeName: (name: string) => void;
  /** When false, still render but disabled (optional). */
  disabled?: boolean;
};

export default function InstructorSelector({ label, instructors, valueName, onChangeName, disabled }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <select
        value={valueName}
        disabled={disabled}
        onChange={(e) => onChangeName(e.target.value)}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        {instructors.map((ins) => (
          <option key={ins.id} value={ins.name}>
            {ins.name}
          </option>
        ))}
      </select>
    </div>
  );
}
