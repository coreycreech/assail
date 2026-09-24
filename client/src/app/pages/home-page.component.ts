import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, PageInfo, PageSection } from '../api.service';

@Component({
  selector: 'app-home-page', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="home-option-page">
      <div class="home-option-hero">
        <div class="home-hero-copy">
          <h1>{{title()}}</h1>
          <p>{{information()}}</p>
          <a class="primary home-cta" routerLink="/content">About Us</a>
        </div>
        <img class="home-illustration" src="/assail-home-clipboard.svg" alt="" aria-hidden="true">
      </div>
      <section id="about" class="home-highlights" *ngIf="servicesIntro() || sections().length">
        <p class="eyebrow">ASSAIL HEALTH CARE</p>
        <h2>Our Services</h2>
        <p class="home-services-intro" *ngIf="servicesIntro()">{{servicesIntro()}}</p>
        <div class="home-section-list">
          <article class="home-section-item" *ngFor="let section of sections(); let i = index">
            <img class="home-section-image" *ngIf="section.imageLocation" [src]="section.imageLocation" [alt]="section.sectionTitle">
            <span class="home-section-number" *ngIf="!section.imageLocation" aria-hidden="true">{{i + 1}}</span>
            <div><h3>{{section.sectionTitle}}</h3><p>{{section.sectionInfo}}</p></div>
          </article>
        </div>
      </section>
    </section>`
})
export class HomePageComponent implements OnInit {
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
