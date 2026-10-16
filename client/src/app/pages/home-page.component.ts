import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, PageInfo, PageSection, ResourceItem } from '../api.service';

@Component({
  selector: 'app-home-page', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="hero"><div class="container hero-inner"><div class="hero-copy"><h1>{{title()}}</h1><p>{{information()}}</p><a class="btn btn-primary" routerLink="/content">About Us</a></div><div class="hero-art"><img src="/designer-hero.svg" alt="Clipboard with medical checklist and pen"></div></div></section>
    <section class="services" id="services" aria-labelledby="home-services-title">
      <div class="container">
        <h2 class="section-title" id="home-services-title">Our Services</h2>
        <p class="section-intro">{{servicesIntro() || 'Support for every step of your care journey, from finding the right resources to keeping visits and records organized.'}}</p>
        <ul class="service-grid">
          <li class="service-card" *ngFor="let section of sections()">
            <img class="service-icon-image" *ngIf="section.imageLocation" [src]="section.imageLocation" alt="" width="64" height="64" loading="lazy">
            <h3>{{section.sectionTitle}}</h3><p>{{section.sectionInfo}}</p>
          </li>
        </ul>
      </div>
    </section>
    <section class="resources-wrap"><div class="container"><div class="resources"><h2 class="section-title section-title--light">Health Care Resources</h2><ul class="resource-list"><li *ngFor="let resource of resources()"><a *ngIf="resource.Url; else resourceName" [href]="resource.Url" target="_blank" rel="noopener noreferrer">{{resource.name}}</a><ng-template #resourceName>{{resource.name}}</ng-template></li></ul><p *ngIf="resourcesError()" role="status">Resources are temporarily unavailable.</p><p *ngIf="!resourcesError() && !resources().length">No health care resources are currently listed.</p><p class="resource-note"><a routerLink="/resources">Sign in to access the resource directory</a></p></div></div></section>
  `
})
export class HomePageComponent implements OnInit {
  resources = signal<Pick<ResourceItem, "resourceId" | "name" | "Url">[]>([]);
  resourcesError = signal(false);
  title = signal('Health care created with you in mind');
  information = signal('We bring care, appointments, and trusted resources together in a clear, accessible experience designed around you.');
  servicesIntro = signal('');
  sections = signal<PageSection[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.publicResources().subscribe({next: rows => this.resources.set(rows), error: () => this.resourcesError.set(true)});
    this.api.pages().subscribe({
      next: pages => {
        const home: PageInfo | undefined = pages.find(page => page.name.trim().toLowerCase() === 'home');
        if (!home) return;
        this.title.set(home.title.trim());
        this.information.set(home.information);
        this.servicesIntro.set(home.servicesIntro || '');
        this.api.pageSections(home.pageId).subscribe({ next: sections => this.sections.set(sections), error: () => this.sections.set([]) });
      },
      error: () => {}
    });
  }
}
