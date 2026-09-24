import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login-page', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="login-page">
      <div class="login-art"><p class="eyebrow">ASSAIL HEALTHCARE</p><h1>Care works better when we’re connected.</h1><p>Sign in to coordinate appointments, documents, clients, and care resources in one place.</p></div>
      <form class="card login-card" (ngSubmit)="submit()">
        <p class="eyebrow">CARE TEAM PORTAL</p><h2>Welcome back</h2><p class="login-intro">Sign in with your care team account.</p>
        <p class="login-error" role="alert" *ngIf="error()">{{error()}}</p>
        <label>Username<input name="userName" [(ngModel)]="userName" autocomplete="username" required maxlength="30" placeholder="Enter your username"></label>
        <label>Password<input name="password" [(ngModel)]="password" autocomplete="current-password" required type="password" placeholder="Enter your password"></label>
        <button class="primary login-submit" type="submit" [disabled]="submitting()">{{submitting() ? 'Signing in…' : 'Sign in'}}</button>
        <a class="login-home" routerLink="/">Return to Home</a>
      </form>
    </section>`
})
export class LoginPageComponent {
  userName = '';
  password = '';
  error = signal('');
  submitting = signal(false);
  constructor(private auth: AuthService, private router: Router) {}
  submit() {
    if (!this.userName.trim() || !this.password) return;
    this.error.set('');
    this.submitting.set(true);
    this.auth.login(this.userName.trim(), this.password).subscribe({
      next: () => { this.submitting.set(false); this.router.navigateByUrl('/calendar'); },
      error: response => { this.submitting.set(false); this.error.set(response.error?.message || 'Unable to sign in. Check your username and password.'); }
    });
  }
}
