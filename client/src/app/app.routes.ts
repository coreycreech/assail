import { AboutPageComponent } from './pages/about-page.component';
import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { HelpPageComponent } from './pages/help-page.component';
import { UserTypesPageComponent } from './pages/user-types-page.component';
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

const adminGuard = () => Number(inject(AuthService).currentUser()?.userTypeId) === 1 || inject(Router).createUrlTree(['/']);
const staffGuard = () => [1,2].includes(Number(inject(AuthService).currentUser()?.userTypeId)) || inject(Router).createUrlTree(['/login']);
export const routes: Routes = [
  { path: 'help', component: HelpPageComponent, title: 'Help', canActivate: [() => !!inject(AuthService).currentUser() || inject(Router).createUrlTree(['/login'])] },
  { path: 'admin/users', component: UsersPageComponent, title: 'Manage users', canActivate: [adminGuard] },
  { path: 'admin/user-types', component: UserTypesPageComponent, title: 'User types', canActivate: [adminGuard] },
  { path: '', component: HomePageComponent, title: 'Overview' },
  { path: 'login', component: LoginPageComponent, title: 'Sign in' },
  { path: 'calendar', canActivate: [staffGuard], component: CalendarPageComponent, title: 'Care calendar' },
  { path: 'billing', canActivate: [staffGuard], component: BillingPageComponent, title: 'Billing worksheet' },
  { path: 'services', canActivate: [staffGuard], component: ServicesPageComponent, title: 'Billing services' },
  { path: 'documents', canActivate: [staffGuard], component: DocumentsPageComponent, title: 'Documents' },
  { path: 'clients', canActivate: [staffGuard], component: ClientsPageComponent, title: 'Clients' },
  { path: 'resources', canActivate: [staffGuard], component: ResourcesPageComponent, title: 'Resources' },
  { path: 'content', component: AboutPageComponent, title: 'About Us' },
  { path: 'admin/content', canActivate: [adminGuard], component: ContentPageComponent, title: 'Edit home page' },
  { path: 'about.html', redirectTo: 'content', pathMatch: 'full' },
  { path: 'about', redirectTo: 'content', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
