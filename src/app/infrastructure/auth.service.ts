import { Injectable, computed, signal } from '@angular/core';
import { ApiService } from './api.service';
import { BudgetStore } from '../application/budget.store';

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  app_metadata?: { roles?: string[] };
  exp?: number;
  iat?: number;
  [k: string]: any;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storageKey = 'auth/token';
  private _token = signal<string | null>(null);

  private decode(token: string | null): JwtPayload | null {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = p.length % 4 ? '='.repeat(4 - (p.length % 4)) : '';
      let jsonStr: string | null = null;
      if (typeof atob === 'function') {
        const bin = atob(p + pad);
        try {
          const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
          jsonStr = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8').decode(bytes) : bin;
        } catch {
          jsonStr = bin;
        }
      } else {
        jsonStr = (globalThis as any).Buffer?.from?.(p + pad, 'base64')?.toString?.('utf-8') ?? null;
      }
      if (!jsonStr) return null;
      return JSON.parse(jsonStr);
    } catch { return null; }
  }

  readonly user = computed(() => this.decode(this._token()));
  readonly isAuthenticated = computed(() => {
    const u = this.user();
    if (!u) return false;
    const now = Math.floor(Date.now() / 1000);
    return !u.exp || u.exp > now;
  });
    readonly role = computed<'admin' | 'user' | 'anonymous'>(() => {
    const u = this.user(); if (!u) return 'anonymous';
    const roles = u.app_metadata?.roles || [];
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('user')) return 'user';
    return 'user';
  });

  readonly isAdmin = computed(() => this.role() === 'admin');

  constructor(private api: ApiService, private budgetStore: BudgetStore) {
      this.load();
  }

  load() {
    try {
      const t = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
      this._token.set(t);
    } catch {}
  }

  async signIn(email: string, password: string) {
    const { access_token } = await this.api.login(email, password);
    this._token.set(access_token);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, access_token); } catch {}
    return access_token;
  }

  async signOut() {
    this._token.set(null);
    this.budgetStore.clear();
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(this.storageKey); } catch {}
  }

  async getAccessToken(): Promise<string | null> { return this._token(); }
  isConfigured(): boolean { return true; }
  async refreshAccessToken(): Promise<string | null> { return this._token(); }

  
}