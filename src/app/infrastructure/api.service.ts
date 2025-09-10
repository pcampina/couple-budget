import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ApiParticipant { id: string; name: string; income: number; email?: string | null }
export interface ApiExpense { id: string; name: string; total: number; type_code?: string; paid?: boolean }
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

  private u(path: string, groupId?: string): string {
    if (!groupId) return this.baseUrl + path;
    const sep = path.includes('?') ? '&' : '?';
    return this.baseUrl + path + `${sep}group=${encodeURIComponent(groupId)}`;
  }

  // Participants
  listParticipants(groupId?: string): Promise<ApiParticipant[]> {
    return firstValueFrom(this.http.get<ApiParticipant[]>(this.u('/participants', groupId)));
  }
  addParticipant(name: string, income: number, email?: string, groupId?: string): Promise<ApiParticipant> {
    const payload: any = { name, income };
    if (email) payload.email = email;
    return firstValueFrom(this.http.post<ApiParticipant>(this.u('/participants', groupId), payload));
  }
  updateParticipant(id: string, patch: Partial<ApiParticipant>, groupId?: string): Promise<ApiParticipant> {
    return firstValueFrom(this.http.patch<ApiParticipant>(this.u(`/participants/${id}`, groupId), patch));
  }
  updateSelfParticipant(patch: Partial<ApiParticipant>, groupId?: string): Promise<ApiParticipant> {
    return firstValueFrom(this.http.patch<ApiParticipant>(this.u(`/participants/me`, groupId), patch));
  }
  deleteParticipant(id: string, groupId?: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.u(`/participants/${id}`, groupId)));
  }

  // Expenses
  listExpenses(groupId?: string): Promise<ApiExpense[]> {
    return firstValueFrom(this.http.get<ApiExpense[]>(this.u('/expenses', groupId)));
  }
  listExpensesPaged(page: number, limit = 20, groupId?: string): Promise<ApiPaged<ApiExpense>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return firstValueFrom(this.http.get<ApiPaged<ApiExpense>>(this.u('/expenses?' + params.toString(), groupId)));
  }
  addExpense(name: string, total: number, type: string = 'expense', groupId?: string): Promise<ApiExpense> {
    return firstValueFrom(this.http.post<ApiExpense>(this.u('/expenses', groupId), { name, total, type }));
  }
  updateExpense(id: string, patch: Partial<ApiExpense> & { type?: string }, groupId?: string): Promise<ApiExpense> {
    return firstValueFrom(this.http.patch<ApiExpense>(this.u(`/expenses/${id}`, groupId), patch));
  }
  deleteExpense(id: string, groupId?: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.u(`/expenses/${id}`, groupId)));
  }

  // Stats
  getStats(groupId?: string): Promise<ApiStats> {
    return firstValueFrom(this.http.get<ApiStats>(this.u('/stats', groupId)));
  }

  // Activities
  listActivities(page: number, limit = 20): Promise<ApiPaged<ApiActivity>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return firstValueFrom(this.http.get<ApiPaged<ApiActivity>>(this.baseUrl + '/activities?' + params.toString()));
  }

  // Group
  listGroupMembers(groupId?: string): Promise<{ id: string; name: string; email: string | null; accepted: boolean }[]> {
    return firstValueFrom(this.http.get<{ id: string; name: string; email: string | null; accepted: boolean }[]>(this.u('/group/members', groupId)));
  }
  listGroups(): Promise<{ id: string; name: string; role: 'owner' | 'member'; shared?: boolean }[]> {
    return firstValueFrom(this.http.get<{ id: string; name: string; role: 'owner' | 'member'; shared?: boolean }[]>(this.baseUrl + '/groups'));
  }
  createGroup(name: string): Promise<{ id: string; name: string; owner_user_id?: string }> {
    return firstValueFrom(this.http.post<{ id: string; name: string; owner_user_id?: string }>(this.baseUrl + '/groups', { name }));
  }
  renameGroup(id: string, name: string): Promise<{ id: string; name: string }> {
    return firstValueFrom(this.http.patch<{ id: string; name: string }>(this.baseUrl + `/groups/${id}`, { name }));
  }
  deleteGroup(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.baseUrl + `/groups/${id}`));
  }
  sendInvites(groupId: string, emails: string[]): Promise<{ id: string; email: string; token: string; created_at: string }[]> {
    return firstValueFrom(this.http.post<{ id: string; email: string; token: string; created_at: string }[]>(this.baseUrl + `/groups/${groupId}/invites`, { emails }));
  }
  listInvites(groupId: string): Promise<{ id: string; email: string; token: string; created_at: string; accepted_at?: string | null }[]> {
    return firstValueFrom(this.http.get<{ id: string; email: string; token: string; created_at: string; accepted_at?: string | null }[]>(this.baseUrl + `/groups/${groupId}/invites`));
  }
  listMyInvites(groupId: string): Promise<{ id: string; email: string; created_at: string; accepted_at?: string | null }[]> {
    return firstValueFrom(this.http.get<{ id: string; email: string; created_at: string; accepted_at?: string | null }[]>(this.baseUrl + `/groups/${groupId}/my-invites`));
  }
  revokeInvite(groupId: string, inviteId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.baseUrl + `/groups/${groupId}/invites/${inviteId}`));
  }
  resendInvite(groupId: string, inviteId: string): Promise<{ id: string; email: string; token: string; created_at: string }> {
    return firstValueFrom(this.http.post<{ id: string; email: string; token: string; created_at: string }>(this.baseUrl + `/groups/${groupId}/invites/${inviteId}/resend`, {}));
  }
  removeGroupMember(groupId: string, participantId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.baseUrl + `/groups/${groupId}/members/${participantId}`));
  }
  leaveGroup(groupId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(this.baseUrl + `/groups/${groupId}/leave`, {}));
  }
  acceptInviteById(groupId: string, inviteId: string): Promise<{ budget_id: string; status: 'accepted' }> {
    return firstValueFrom(this.http.post<{ budget_id: string; status: 'accepted' }>(this.baseUrl + `/groups/${groupId}/invites/${inviteId}/accept`, {}));
  }
  rejectInviteById(groupId: string, inviteId: string): Promise<{ status: string }> {
    return firstValueFrom(this.http.post<{ status: string }>(this.baseUrl + `/groups/${groupId}/invites/${inviteId}/reject`, {}));
  }
  acceptInvite(token: string): Promise<{ budget_id: string; status: 'accepted' }> {
    return firstValueFrom(this.http.post<{ budget_id: string; status: 'accepted' }>(this.baseUrl + `/invites/accept`, { token }));
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

  // User
  getUsersMe(): Promise<any> {
    return firstValueFrom(this.http.get<any>(this.u(`/users/me`)));
  }
  updateUser(patch: { default_income?: number }): Promise<any> {
    return firstValueFrom(this.http.patch<any>(this.u(`/users/me`), patch));
  }
}
