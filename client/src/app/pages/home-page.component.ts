import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, PageInfo, PageSection } from '../api.service';

@Component({
  selector: 'app-home-page', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="hero"><div class="container hero-inner"><div class="hero-copy"><h1>{{title()}}</h1><p>{{information()}}</p><a class="btn btn-primary" routerLink="/content">About Us</a></div><div class="hero-art"><img src="/designer-hero.svg" alt="Clipboard with medical checklist and pen"></div></div></section>
    <section class="services" id="services" aria-labelledby="home-services-title">
      <div class="container">
        <h2 class="section-title" id="home-services-title">Our Services</h2>
        <p class="section-intro">{{servicesIntro() || 'Support for every step of your care journey, from finding the right resources to keeping visits and records organized.'}}</p>
        <ul class="service-grid">
          <li class="service-card" *ngFor="let service of serviceCards; let i=index">
            <img class="service-icon-image" [src]="'/designer-service-' + (i + 1) + '.svg'" alt="" width="64" height="64" loading="lazy">
            <h3>{{service.title}}</h3><p>{{service.description}}</p>
          </li>
        </ul>
        <section class="additional-services" *ngIf="sections().length" aria-labelledby="additional-services-title">
          <h2 class="section-title" id="additional-services-title">More About Our Care</h2>
          <ul class="service-grid"><li class="service-card" *ngFor="let section of sections()">
            <img class="service-icon-image" *ngIf="section.imageLocation" [src]="section.imageLocation" alt="" loading="lazy">
            <h3>{{section.sectionTitle}}</h3><p>{{section.sectionInfo}}</p>
          </li></ul>
        </section>
      </div>
    </section>
    <section class="resources-wrap"><div class="container"><div class="resources"><h2 class="section-title section-title--light">Health Care Resources</h2><ul class="resource-list"><li *ngFor="let resource of resourceNames">{{resource}}</li></ul><p class="resource-note"><a routerLink="/resources">Sign in to access the resource directory</a></p></div></div></section>
  `
})
export class HomePageComponent implements OnInit {
  readonly serviceCards = [
    {title: 'Find the Right Care', description: 'Explore care resources and connect with your care team to discuss the support that fits your needs.'},
    {title: 'Medication Conversations', description: 'Keep medication questions and instructions organized so you can discuss them with your healthcare professional.'},
    {title: 'Stay Connected', description: 'Keep your care information within reach and prepare questions for your next conversation with your care team.'},
    {title: 'Personalized Care Planning', description: 'Bring visit details, priorities, and care notes together to help your team coordinate support around you.'},
    {title: 'Everyday Care Support', description: 'Plan care visits and keep the people involved informed about the assistance needed for day-to-day wellbeing.'},
    {title: 'Organized Health Records', description: 'Keep important documents and visit information together, making it easier to find the details your care team needs.'}
  ];
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
        this.api.pageSections(home.pageId).subscribe({ next: sections => this.sections.set(sections.filter(section => !['fun night', 'joy night'].includes(section.sectionTitle.replace(/!+/g, '').trim().replace(/\s+/g, ' ').toLowerCase()))), error: () => this.sections.set([]) });
      },
      error: () => {}
    });
  }
}
