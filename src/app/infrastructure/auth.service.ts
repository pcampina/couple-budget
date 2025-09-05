import { Injectable, computed, signal } from '@angular/core';
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private client: SupabaseClient | null = null;
  private _session = signal<Session | null>(null);
  readonly session = computed(() => this._session());
  readonly user = computed<User | null>(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this._session());
  readonly role = computed<'admin' | 'user' | 'anonymous'>(() => {
    const u = this._session()?.user; if (!u) return 'anonymous';
    const roles = (u.app_metadata as any)?.roles as string[] | undefined;
    if (roles?.includes('admin')) return 'admin';
    if (roles?.includes('user')) return 'user';
    return 'user';
  });

  constructor() {
    try {
      const url = (window as any).__SUPABASE_URL__ as string | undefined;
      const anon = (window as any).__SUPABASE_ANON_KEY__ as string | undefined;
      if (url && anon) {
        this.client = createClient(url, anon);
        this.client.auth.getSession().then(({ data }) => this._session.set(data.session));
        this.client.auth.onAuthStateChange((_event, session) => this._session.set(session));
      }
    } catch {}
  }

  async signInWithPassword(email: string, password: string) {
    if (!this.client) throw new Error('Supabase client not configured');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this._session.set(data.session);
    return data.session;
  }

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
    this._session.set(null);
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.client) return null;
    const { data } = await this.client.auth.getSession();
    return data.session?.access_token ?? null;
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.auth.refreshSession();
      if (error) return null;
      if (data.session) this._session.set(data.session);
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }
}
