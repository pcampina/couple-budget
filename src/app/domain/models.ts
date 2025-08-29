export type ExpenseId = string;

export interface Expense {
  id: ExpenseId;
  name: string;
  total: number;
}

export interface Split {
  p1: number;
  p2: number;
}
