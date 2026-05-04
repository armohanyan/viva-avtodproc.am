/** Generic labeled value for selects, filters, and comboboxes. */
export type SelectOption<TValue extends string | number = string> = {
  value: TValue;
  label: string;
  disabled?: boolean;
};
