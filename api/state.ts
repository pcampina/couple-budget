import { uuid } from './utils';

export interface Participant { id: string; name: string; income: number }
export interface Expense { id: string; name: string; total: number }

export interface State {
  participants: Participant[];
  expenses: Expense[];
}

function initialState(): State {
  return {
    participants: [
      { id: uuid(), name: 'John Doe', income: 2000 },
      { id: uuid(), name: 'Jane Doe', income: 1600 },
    ],
    expenses: [
      { id: uuid(), name: 'Aluguel', total: 1200 },
    ],
  };
}

export const state: State = initialState();

export function resetState(): void {
  const fresh = initialState();
  state.participants = fresh.participants;
  state.expenses = fresh.expenses;
}
