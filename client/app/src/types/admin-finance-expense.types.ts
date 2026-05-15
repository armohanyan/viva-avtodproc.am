export type AdminExpensePurpose = "car" | "branch_rent" | "salary" | "other";

export type AdminFinanceExpense = {
  id: string;
  title: string;
  amount: number;
  date: string;
  purpose: AdminExpensePurpose;
  purposeLabel: string;
  relatedEntityType: "car" | "branch" | "instructor" | null;
  relatedEntityId: string | null;
  relatedEntityLabel: string | null;
  expenseSubtype: string | null;
  customPurposeText: string | null;
  notes: string | null;
  createdByAdminId: number | null;
  createdByAdminName: string | null;
  source: "car_expense" | "finance_transaction" | "finance_expense";
};

export type CreateAdminFinanceExpenseBody = {
  title: string;
  amount: number;
  date: string;
  purpose: AdminExpensePurpose;
  relatedEntityType?: "car" | "branch" | "instructor" | null;
  relatedEntityId?: string | null;
  expenseSubtype?: string | null;
  customPurposeText?: string | null;
  notes?: string | null;
};
