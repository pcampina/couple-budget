import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/infrastructure/auth.service';
import { UiService } from '@app/infrastructure/ui.service';
import { NotificationService } from '@app/infrastructure/notification.service';
import { ErrorService } from '@app/infrastructure/error.service';
import { NgpButton } from 'ng-primitives/button';
import { NgpInput } from 'ng-primitives/input';
import { NgpLabel } from 'ng-primitives/form-field';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, NgpButton, NgpInput],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  email = '';
  password = '';
  error: string | null = null;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly errorService = inject(ErrorService);
  readonly uiService = inject(UiService);

  async signIn() {
    this.error = null;

    const email = String(this.email || '').trim();
    const password = String(this.password || '');

    if (!email || !password) {
      this.error = 'Please fill in both email and password.';
      this.notificationService.error(this.error);
      return;
    }

    this.uiService.showLoading();

    try {
      await this.authService.signIn(email, password);
      this.notificationService.success('Welcome!');
      await this.router.navigateByUrl('/');
    } catch (error: unknown) {
      this.error = this.errorService.handle(error, {
        userMessage: 'Could not sign in.',
        showToast: true,
        context: 'login',
      });
    } finally {
      this.uiService.hideLoading();
    }
  }
}
