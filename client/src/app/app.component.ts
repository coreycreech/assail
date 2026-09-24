import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  online = signal(false);
  currentYear = new Date().getFullYear();
  isPublicLayout = signal(true);
  isHomePage = signal(true);

  constructor(private api: ApiService, readonly auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.setLayout(this.router.url);
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => this.setLayout((event as NavigationEnd).urlAfterRedirects));
    this.api.health().subscribe({ next: () => this.online.set(true), error: () => this.online.set(false) });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  private setLayout(url: string) {
    const path = url.split('?')[0].replace(/\/$/, '');
    this.isHomePage.set(path === '');
    this.isPublicLayout.set(path === '' || path === '/login' || path === '/content');
  }
}
