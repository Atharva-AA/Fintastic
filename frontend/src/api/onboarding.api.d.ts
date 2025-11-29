export interface BasicProfilePayload {
  occupation: string[];
  age: number;
  dependents: number;
  cityType: string;
  riskLevel: string;
}

export function submitBasicProfile(data: BasicProfilePayload): Promise<any>;

export interface ExpensePayloadItem {
  category: string;
  amount: number;
  subtype: 'fixed' | 'variable' | 'one-time';
  note?: string;
}

export interface ExpensePayload {
  expenses: ExpensePayloadItem[];
}

export function submitExpense(data: ExpensePayload): Promise<any>;

export interface IncomePayloadItem {
  category: string;
  amount: number;
  subtype: 'fixed' | 'variable' | 'one-time';
  note?: string;
}

export interface IncomePayload {
  incomes: IncomePayloadItem[];
}

export function submitIncome(data: IncomePayload): Promise<any>;

export interface SavingsEntryPayload {
  category: string;
  amount: number;
  note?: string;
}

export interface SavingsInvestmentsPayload {
  savings: SavingsEntryPayload[];
  investments: SavingsEntryPayload[];
}

export function submitSavingsAndInvestments(
  data: SavingsInvestmentsPayload
): Promise<any>;
