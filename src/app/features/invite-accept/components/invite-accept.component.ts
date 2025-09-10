import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '@app/infrastructure/api.service';
import { NotificationService } from '@app/infrastructure/notification.service';
import { ErrorService } from '@app/infrastructure/error.service';
import { BudgetStore } from '@application/budget.store';

@Component({
  selector: 'app-invite-accept',
  standalone: true,
  templateUrl: './invite-accept.component.html'
})
export class InviteAcceptComponent {
  private api = inject(ApiService);
  private notify = inject(NotificationService);
  private errors = inject(ErrorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private store = inject(BudgetStore);

  constructor() { this.accept(); }

  async accept() {
    try {
      const token = String(this.route.snapshot.paramMap.get('token') || '').trim();
      if (!token) { this.notify.error('Invalid invite'); await this.router.navigateByUrl('/'); return; }
      const res = await this.api.acceptInvite(token);
      this.store.setGroupId(res.budget_id || null);
      this.notify.success('Invite accepted');
      await this.router.navigateByUrl('/group');
    } catch (e: any) {
      let userMessage = 'Failed to accept invite';
      if (e && e.error && typeof e.error.error === 'string') {
        const backendError = e.error.error;
        if (backendError === 'Missing token') {
          userMessage = 'Invite token is missing.';
        } else if (backendError === 'Invite not found') {
          userMessage = 'Invite not found or has expired.';
        } else if (backendError === 'Invite already accepted') {
          userMessage = 'This invite has already been accepted.';
        } else if (backendError === 'You are not the owner of this invite email') {
          userMessage = 'You are not authorized to accept this invite. Please log in with the correct email.';
        }
      }
      this.errors.handle(e, { userMessage: userMessage, showToast: true, context: 'invite.accept' });
      try { await this.router.navigateByUrl('/'); } catch {} 
    }
  }
}
