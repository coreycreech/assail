import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UsersPageComponent } from './pages/users-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { CalendarPageComponent } from './pages/calendar-page.component';
import { BillingPageComponent } from './pages/billing-page.component';
import { ServicesPageComponent } from './pages/services-page.component';
import { DocumentsPageComponent } from './pages/documents-page.component';
import { ClientsPageComponent } from './pages/clients-page.component';
import { ResourcesPageComponent } from './pages/resources-page.component';
import { ContentPageComponent } from './pages/content-page.component';
import { LoginPageComponent } from './pages/login-page.component';

export const routes: Routes = [
  { path: 'admin/users', component: UsersPageComponent, title: 'Manage users', canActivate: [() => Number(inject(AuthService).currentUser()?.userTypeId) === 1 || inject(Router).createUrlTree(['/login'])] },
  { path: '', component: HomePageComponent, title: 'Overview' },
  { path: 'login', component: LoginPageComponent, title: 'Sign in' },
  { path: 'calendar', component: CalendarPageComponent, title: 'Care calendar' },
  { path: 'billing', component: BillingPageComponent, title: 'Billing worksheet' },
  { path: 'services', component: ServicesPageComponent, title: 'Billing services' },
  { path: 'documents', component: DocumentsPageComponent, title: 'Documents' },
  { path: 'clients', component: ClientsPageComponent, title: 'Clients' },
  { path: 'resources', component: ResourcesPageComponent, title: 'Resources' },
  { path: 'content', component: ContentPageComponent, title: 'About Us' },
  { path: 'admin/content', component: ContentPageComponent, title: 'Edit home page' },
  { path: '**', redirectTo: '' }
];
