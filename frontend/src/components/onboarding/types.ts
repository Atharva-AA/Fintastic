export type IncomeSubtype = 'fixed' | 'variable' | 'one-time';

export interface IncomeItem {
  id: string;
  category: string;
  subtype: IncomeSubtype;
  amount?: string;
  note?: string;
  source?: 'preset' | 'custom';
}

export type ExpenseSubtype = 'fixed' | 'variable' | 'one-time';

export interface ExpenseItem {
  id: string;
  category: string;
  subtype: ExpenseSubtype;
  amount?: string;
  note?: string;
  source?: 'preset' | 'custom';
}

export type GoalPriority = 'must_have' | 'good_to_have';

export interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  priority: GoalPriority;
  deadline?: string;
  source?: 'preset' | 'custom';
}

export interface SavingsItem {
  id: string;
  category: string;
  amount?: string;
  note?: string;
  source?: 'preset' | 'custom';
}

export interface InvestmentItem {
  id: string;
  category: string;
  amount?: string;
  note?: string;
  source?: 'preset' | 'custom';
}

export interface FormData {
  roles?: string[];
  age?: string;
  dependents?: number;
  incomes?: IncomeItem[];
  expenses?: ExpenseItem[];
  goals?: GoalItem[];
  savings?: SavingsItem[];
  investments?: InvestmentItem[];
  // Temp editing state
  _selectedFixedExpenses?: string[];
  _selectedVariableExpenses?: string[];
  _selectedDebtExpenses?: string[];
  _showSavedMessage?: boolean;
  _showCustomExpenseInput?: boolean;
  _customExpenseName?: string;
}


