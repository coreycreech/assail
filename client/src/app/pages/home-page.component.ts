import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, PageInfo, PageSection } from '../api.service';

@Component({
  selector: 'app-home-page', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="hero"><div class="container hero-inner"><div class="hero-copy"><h1>{{title()}}</h1><p>{{information()}}</p><a class="btn btn-primary" routerLink="/content">About Us</a></div><div class="hero-art"><img src="/designer-hero.svg" alt="Clipboard with medical checklist and pen"></div></div></section>
    <section class="services" id="services" *ngIf="servicesIntro() || sections().length"><div class="container"><h2 class="section-title">Our Services</h2><p class="section-intro" *ngIf="servicesIntro()">{{servicesIntro()}}</p><ul class="service-grid"><li class="service-card" *ngFor="let section of sections(); let i=index"><img class="service-icon-image" [src]="section.imageLocation || '/designer-service-' + (i % 6 + 1) + '.svg'" alt=""><h3>{{section.sectionTitle}}</h3><p>{{section.sectionInfo}}</p></li></ul></div></section>
    <section class="resources-wrap"><div class="container"><div class="resources"><h2 class="section-title section-title--light">Health Care Resources</h2><ul class="resource-list"><li *ngFor="let resource of resourceNames">{{resource}}</li></ul><p class="resource-note"><a routerLink="/resources">Sign in to access the resource directory</a></p></div></div></section>
  `
})
export class HomePageComponent implements OnInit {
  readonly resourceNames = ["Virginia Medicaid's Managed Care Program", 'Provider Secure Web Portal | Aetna', 'Atrezzo/Acentra Provider Portal', 'PCA Team | Anthem', 'Direct VA', 'Anthem Providers', 'Direct My Care', 'Office Ally', 'PPL First', 'Sentara Health Plans Provider'];
  title = signal('Health care created with you in mind');
  information = signal('We bring care, appointments, and trusted resources together in a clear, accessible experience designed around you.');
  servicesIntro = signal('');
  sections = signal<PageSection[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit() {
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
