import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, PageInfo, PageSection } from '../api.service';
@Component({selector:'app-about-page',standalone:true,imports:[CommonModule],styles:['.managed-about-copy{white-space:pre-wrap;overflow-wrap:anywhere}.section-heading{display:flex;align-items:center;gap:14px}.quote-icon{width:42px;height:36px;flex-shrink:0}'],template: `
  <ng-container *ngIf="page() as about">
    <section class="page-banner"><div class="container"><h1>{{about.name}}</h1><p>{{about.title}}</p></div></section>
    <section class="about-story"><div class="container container--narrow"><h2>{{about.name}}</h2><p class="managed-about-copy" *ngFor="let paragraph of aboutParagraphs(about.information)">{{paragraph}}</p></div></section>
    <section class="mission" [class.customer-comments]="isCustomerComments(section)" *ngFor="let section of sections()"><div class="container container--narrow mission-inner">
      <div class="mission-copy"><h2 class="section-heading" *ngIf="!isCustomerComments(section)">{{section.sectionTitle}}</h2><p class="managed-about-copy">{{isCustomerComments(section) ? commentText(section.sectionInfo) : section.sectionInfo}}</p><span class="comment-author" *ngIf="isCustomerComments(section)">Angela Smith</span></div>
      <div class="mission-art" *ngIf="section.imageLocation || isMission(section)"><img [src]="section.imageLocation || '/assail-calendar-doctor.jpg'" [alt]="section.sectionTitle" width="300" height="280"></div>
    </div></section>
  </ng-container>
  <p class="container" role="status" *ngIf="error()">{{error()}}</p>
`})
export class AboutPageComponent implements OnInit {
  page = signal<PageInfo | null>(null);
  sections = signal<PageSection[]>([]);
  error = signal('');
  constructor(private api: ApiService) {}
  isCustomerComments(section: PageSection) { return section.sectionTitle.trim().toLowerCase() === 'customer comments'; }
  isMission(section: PageSection) { return section.sectionTitle.trim().toLowerCase() === 'our mission'; }
  aboutParagraphs(information: string) { return information.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean); }
  commentText(information: string) { return information.replace(/\n\s*\nAngela Smith\s*$/i, '').trim(); }
  private sectionOrder(section: PageSection) {
    const title = section.sectionTitle.trim().toLowerCase();
    return this.isCustomerComments(section) ? 0 : title === 'our mission' ? 1 : 2;
  }
  ngOnInit() {
    this.api.pages().subscribe({next: pages => {
      const about = pages.find(p => ['about','about us'].includes(p.name.trim().toLowerCase()));
      if (!about) { this.error.set('About Us content is not available yet.'); return; }
      this.page.set(about);
      this.api.pageSections(about.pageId).subscribe({next: rows => this.sections.set([...rows].sort((a, b) => this.sectionOrder(a) - this.sectionOrder(b))), error: () => this.error.set('Unable to load additional content.')});
    }, error: () => this.error.set('Unable to load About Us. Please try again later.')});
  }
}
