import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ApiParticipant { id: string; name: string; income: number; email?: string | null }
export interface ApiExpense { id: string; name: string; total: number; type_code?: string }
export interface ApiTransactionType { code: string; name: string }
export interface ApiActivity { id: string; action: string; entity_type: string; entity_id: string; payload: any; created_at: string }
export interface ApiPaged<T> { items: T[]; total: number; page: number; pageSize: number }
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
  addParticipant(name: string, income: number, email?: string): Promise<ApiParticipant> {
    const payload: any = { name, income };
    if (email) payload.email = email;
    return firstValueFrom(this.http.post<ApiParticipant>(this.baseUrl + '/participants', payload));
  }
  updateParticipant(id: string, patch: Partial<ApiParticipant>): Promise<ApiParticipant> {
    return firstValueFrom(this.http.patch<ApiParticipant>(this.baseUrl + `/participants/${id}`, patch));
  }
  updateSelfParticipant(patch: Partial<ApiParticipant>): Promise<ApiParticipant> {
    return firstValueFrom(this.http.patch<ApiParticipant>(this.baseUrl + `/participants/me`, patch));
  }
  deleteParticipant(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.baseUrl + `/participants/${id}`));
  }

  // Expenses
  listExpenses(): Promise<ApiExpense[]> {
    return firstValueFrom(this.http.get<ApiExpense[]>(this.baseUrl + '/expenses'));
  }
  listExpensesPaged(page: number, limit = 20): Promise<ApiPaged<ApiExpense>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return firstValueFrom(this.http.get<ApiPaged<ApiExpense>>(this.baseUrl + '/expenses?' + params.toString()));
  }
  addExpense(name: string, total: number, type: string = 'expense'): Promise<ApiExpense> {
    return firstValueFrom(this.http.post<ApiExpense>(this.baseUrl + '/expenses', { name, total, type }));
  }
  updateExpense(id: string, patch: Partial<ApiExpense> & { type?: string }): Promise<ApiExpense> {
    return firstValueFrom(this.http.patch<ApiExpense>(this.baseUrl + `/expenses/${id}`, patch));
  }
  deleteExpense(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.baseUrl + `/expenses/${id}`));
  }

  // Stats
  getStats(): Promise<ApiStats> {
    return firstValueFrom(this.http.get<ApiStats>(this.baseUrl + '/stats'));
  }

  // Activities
  listActivities(page: number, limit = 20): Promise<ApiPaged<ApiActivity>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return firstValueFrom(this.http.get<ApiPaged<ApiActivity>>(this.baseUrl + '/activities?' + params.toString()));
  }

  // Group
  listGroupMembers(): Promise<{ id: string; name: string; email: string | null; accepted: boolean }[]> {
    return firstValueFrom(this.http.get<{ id: string; name: string; email: string | null; accepted: boolean }[]>(this.baseUrl + '/group/members'));
  }

  // Auth
  login(email: string, password: string): Promise<{ access_token: string }> {
    return firstValueFrom(this.http.post<{ access_token: string }>(this.baseUrl + '/auth/login', { email, password }));
  }
  register(name: string, email: string, password: string): Promise<{ id: string; email: string; name: string; role: string }> {
    return firstValueFrom(this.http.post<{ id: string; email: string; name: string; role: string }>(this.baseUrl + '/auth/register', { name, email, password }));
  }
  verifyToken(token: string): Promise<{ valid: boolean; payload?: any }> {
    const headers = { Authorization: 'Bearer ' + token } as any;
    return firstValueFrom(this.http.get<{ valid: boolean; payload?: any }>(this.baseUrl + '/auth/verify', { headers }));
  }

  // Transaction types
  listTransactionTypes(): Promise<ApiTransactionType[]> {
    return firstValueFrom(this.http.get<ApiTransactionType[]>(this.baseUrl + '/transaction-types'));
  }
}
