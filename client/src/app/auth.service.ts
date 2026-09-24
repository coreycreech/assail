import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService, AuthUser } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<AuthUser | null>(this.readStoredUser());
  constructor(private api: ApiService) {}

  login(userName: string, password: string) {
    return this.api.login(userName, password).pipe(tap(response => {
      this.currentUser.set(response.user);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('assail-user', JSON.stringify(response.user));
        sessionStorage.setItem('assail-token', response.token);
      }
    }));
  }

  logout() {
    this.currentUser.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('assail-user');
      sessionStorage.removeItem('assail-token');
    }
  }

  private readStoredUser(): AuthUser | null {
    if (typeof sessionStorage === 'undefined') return null;
    if (!sessionStorage.getItem('assail-token')) return null;
    try { return JSON.parse(sessionStorage.getItem('assail-user') || 'null') as AuthUser | null; }
    catch { return null; }
  }
}
