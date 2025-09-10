import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../infrastructure/api.service';
import { NotificationService } from '../../../infrastructure/notification.service';
import { ErrorService } from '../../../infrastructure/error.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './groups-list.component.html'
})
export class GroupsListComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly errors = inject(ErrorService);
  groups = signal<{ id: string; name: string; role: 'owner' | 'member'; shared?: boolean }[]>([]);
  name = '';
  constructor() { this.load(); }
  async load() {
    try { this.groups.set(await this.api.listGroups()); } catch (e) { this.errors.handle(e, { userMessage: 'Failed to load groups', showToast: true, context: 'groups.list' }); }
  }
  async create() {
    const n = this.name.trim(); if (!n) return;
    try { const g = await this.api.createGroup(n); this.name = ''; this.notify.success('Group created'); await this.load(); await this.open((g as any).id); } 
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to create group', showToast: true, context: 'groups.create' }); }
  }
  async open(id: string) { try { await this.router.navigate(['/transactions', id]); } catch {} }
}
