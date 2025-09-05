import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ApiParticipant { id: string; name: string; income: number }
export interface ApiExpense { id: string; name: string; total: number }
export interface ApiStats {
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  participantShares: { id: string; name: string; share: number }[];
  expensesWithAllocations: (ApiExpense & { allocations: Record<string, number> })[];
  totalIncome: number;
  totalExpenses: number;
  totalsPerParticipant: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://localhost:3333';

  constructor(private http: HttpClient) {}

  // Participants
  listParticipants(): Promise<ApiParticipant[]> {
    return firstValueFrom(this.http.get<ApiParticipant[]>(this.baseUrl + '/participants'));
  }
  addParticipant(name: string, income: number): Promise<ApiParticipant> {
    return firstValueFrom(this.http.post<ApiParticipant>(this.baseUrl + '/participants', { name, income }));
  }
  updateParticipant(id: string, patch: Partial<ApiParticipant>): Promise<ApiParticipant> {
    return firstValueFrom(this.http.patch<ApiParticipant>(this.baseUrl + `/participants/${id}`, patch));
  }
  deleteParticipant(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.baseUrl + `/participants/${id}`));
  }

  // Expenses
  listExpenses(): Promise<ApiExpense[]> {
    return firstValueFrom(this.http.get<ApiExpense[]>(this.baseUrl + '/expenses'));
  }
  addExpense(name: string, total: number): Promise<ApiExpense> {
    return firstValueFrom(this.http.post<ApiExpense>(this.baseUrl + '/expenses', { name, total }));
  }
  updateExpense(id: string, patch: Partial<ApiExpense>): Promise<ApiExpense> {
    return firstValueFrom(this.http.patch<ApiExpense>(this.baseUrl + `/expenses/${id}`, patch));
  }
  deleteExpense(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.baseUrl + `/expenses/${id}`));
  }

  // Stats
  getStats(): Promise<ApiStats> {
    return firstValueFrom(this.http.get<ApiStats>(this.baseUrl + '/stats'));
  }
}
