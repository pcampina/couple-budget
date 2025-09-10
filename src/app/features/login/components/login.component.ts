import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../infrastructure/auth.service';
import { UiService } from '../../infrastructure/ui.service';
import { NotificationService } from '../../infrastructure/notification.service';
import { ErrorService } from '../../infrastructure/error.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  error: string | null = null;
  configured = true;

  readonly ui = inject(UiService);
  readonly notify = inject(NotificationService);
  readonly errors = inject(ErrorService);
  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    this.error = null;
    const email = String(this.email || '').trim();
    const password = String(this.password || '');
    if (!email || !password) {
      this.error = 'Preencha o email e a palavra‑passe.';
      this.notify.error(this.error);
      return;
    }
    this.ui.showLoading();
    try {
      await this.auth.signIn(email, password);
      this.notify.success('Bem‑vindo!');
      await this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = this.errors.handle(e, { userMessage: 'Não foi possível iniciar sessão.', showToast: true, context: 'login' });
    } finally {
      this.ui.hideLoading();
    }
  }
}
