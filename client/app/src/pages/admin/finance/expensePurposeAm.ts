import type { AdminExpensePurpose } from "src/types/admin-finance-expense.types";

export const EXPENSE_ENTITY_OTHER_AM = "Այլ";

export const EXPENSE_PURPOSE_OPTIONS: readonly { value: AdminExpensePurpose; label: string }[] = [
  { value: "car", label: "Մեքենայի ծախս" },
  { value: "branch_rent", label: "Գրասենյակի / մասնաճյուղի վարձ" },
  { value: "salary", label: "Աշխատավարձ" },
  { value: "other", label: "Այլ" },
] as const;

export function purposeLabel(purpose: AdminExpensePurpose): string {
  return EXPENSE_PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label ?? purpose;
}
