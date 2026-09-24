import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, PageFields, PageInfo, PageSection, PageSectionFields } from '../api.service';
import { AuthService } from '../auth.service';

interface SectionDraft {
  sectionId: number | null;
  sectionTitle: string;
  sectionInfo: string;
  saving: boolean;
}

@Component({
  selector: 'app-content-page', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="home-editor-page">
      <ng-container *ngIf="auth.currentUser() && isEditorPage; else publicAbout">
        <div class="section-head home-editor-heading"><div><p class="eyebrow">SITE ADMINISTRATION</p><h1>Edit home page</h1><p>Update the headline and supporting copy visitors see on the home page.</p></div><span class="admin-badge">Signed in as {{auth.currentUser()?.firstName || auth.currentUser()?.userName}}</span></div>
        <p class="home-editor-message success-message" role="status" *ngIf="success()">{{success()}}</p>
        <p class="error" role="alert" *ngIf="error()">{{error()}}</p>
        <form class="card home-copy-editor" (ngSubmit)="saveHome()">
          <div class="form-heading"><span class="form-icon" aria-hidden="true">Aa</span><div><h2>Home page introduction</h2><p>Keep the headline brief so it fits on desktop and mobile screens.</p></div></div>
          <label>Headline<input name="homeTitle" [(ngModel)]="title" maxlength="50" required></label>
          <label>Supporting copy<textarea name="homeInformation" [(ngModel)]="information" maxlength="500" rows="4" required></textarea></label>
          <div class="home-editor-actions"><span>Up to 50 characters for the headline and 500 for the supporting copy.</span><button class="primary" type="submit" [disabled]="saving()">{{saving() ? 'Saving...' : 'Save home page'}}</button></div>
        </form>

        <section class="card home-highlight-editor">
          <div class="home-editor-section-heading"><div><p class="eyebrow">OPTIONAL CONTENT</p><h2>Home page highlights</h2><p>Add short information cards below the main introduction.</p></div><button type="button" class="primary" (click)="addHighlight()" [disabled]="!pageId">Add highlight</button></div>
          <p class="client-id-note" *ngIf="!pageId">Save the introduction first to enable highlight cards.</p>
          <article class="home-highlight-edit-row" *ngFor="let section of highlights(); let i = index">
            <label>Card title<input [name]="'sectionTitle' + i" [(ngModel)]="section.sectionTitle" maxlength="50" required></label>
            <label>Card text<textarea [name]="'sectionInfo' + i" [(ngModel)]="section.sectionInfo" maxlength="500" rows="3" required></textarea></label>
            <div class="home-highlight-edit-actions"><button class="event-action" type="button" (click)="saveHighlight(section)" [disabled]="section.saving">{{section.saving ? 'Saving...' : 'Save card'}}</button><button class="event-action delete-event" type="button" (click)="deleteHighlight(section)">Remove</button></div>
          </article>
          <p class="calendar-empty" *ngIf="!highlights().length">No highlight cards yet. Add one to show more information on the home page.</p>
        </section>
      </ng-container>

      <ng-template #publicAbout>
        <section class="public-about-page">
          <p class="eyebrow">ABOUT ASSAIL HEALTH CARE</p><h1>{{title}}</h1><p class="public-about-copy">{{information}}</p>
          <div class="home-highlight-grid" *ngIf="highlights().length"><article class="card home-highlight" *ngFor="let section of highlights()"><span class="home-highlight-mark" aria-hidden="true">+</span><div><h2>{{section.sectionTitle}}</h2><p>{{section.sectionInfo}}</p></div></article></div>
          <div class="public-about-admin" *ngIf="auth.currentUser(); else signInPrompt"><span>Care team member?</span><a class="primary" routerLink="/admin/content">Edit home page</a></div>
          <ng-template #signInPrompt><div class="public-about-admin"><span>Care team member?</span><a class="primary" routerLink="/login">Sign in to edit this page</a></div></ng-template>
        </section>
      </ng-template>
    </section>`
})
export class ContentPageComponent implements OnInit {
  readonly isEditorPage: boolean;
  pageId: number | null = null;
  title = 'Health care created with you in mind';
  information = 'We bring care, appointments, and trusted resources together in a clear, accessible experience designed around you.';
  highlights = signal<SectionDraft[]>([]);
  saving = signal(false);
  success = signal('');
  error = signal('');

  constructor(readonly auth: AuthService, private api: ApiService, router: Router) {
    this.isEditorPage = router.url.split('?')[0].replace(/\/$/, '') === '/admin/content';
  }

  ngOnInit() {
    this.api.pages().subscribe({
      next: pages => {
        const home: PageInfo | undefined = pages.find(page => page.name.trim().toLowerCase() === 'home');
        if (!home) return;
        this.pageId = home.pageId;
        this.title = home.title.trim();
        this.information = home.information;
        this.loadHighlights(home.pageId);
      },
      error: error => this.error.set(error.error?.message || 'Unable to load home page content.')
    });
  }

  private loadHighlights(pageId: number) {
    this.api.pageSections(pageId).subscribe({
      next: sections => this.highlights.set(sections.map((section: PageSection) => ({ sectionId: section.sectionId, sectionTitle: section.sectionTitle.trim(), sectionInfo: section.sectionInfo, saving: false }))),
      error: error => this.error.set(error.error?.message || 'Unable to load home page highlights.')
    });
  }

  saveHome() {
    const title = this.title.trim();
    const information = this.information.trim();
    if (!title || !information) { this.error.set('Enter both a headline and supporting copy.'); return; }
    const fields: PageFields = { name: 'home', title, information };
    this.saving.set(true); this.error.set(''); this.success.set('');
    const handleError = (error: any) => { this.saving.set(false); this.error.set(error.error?.message || 'Unable to save the home page. Please try again.'); };
    if (this.pageId === null) {
      this.api.createPage(fields).subscribe({
        next: page => { this.pageId = page.pageId; this.saving.set(false); this.success.set('Home page content saved.'); },
        error: handleError
      });
      return;
    }
    this.api.updatePage(this.pageId, fields).subscribe({
      next: () => { this.saving.set(false); this.success.set('Home page content saved.'); },
      error: handleError
    });
  }

  addHighlight() {
    if (this.pageId === null) { this.error.set('Save the home page introduction before adding highlights.'); return; }
    this.highlights.update(rows => [...rows, { sectionId: null, sectionTitle: '', sectionInfo: '', saving: false }]);
    this.error.set(''); this.success.set('');
  }

  saveHighlight(section: SectionDraft) {
    if (this.pageId === null || !section.sectionTitle.trim() || !section.sectionInfo.trim()) { this.error.set('Enter a title and text for this highlight.'); return; }
    const fields: PageSectionFields = { sectionTitle: section.sectionTitle.trim(), sectionInfo: section.sectionInfo.trim() };
    section.saving = true; this.error.set(''); this.success.set('');
    const completeSave = (sectionId: number | null) => {
      if (sectionId !== null) section.sectionId = sectionId;
      section.saving = false; this.highlights.update(rows => [...rows]); this.success.set('Highlight saved.');
    };
    const failSave = (error: any) => { section.saving = false; this.highlights.update(rows => [...rows]); this.error.set(error.error?.message || 'Unable to save this highlight.'); };
    if (section.sectionId === null) {
      this.api.createPageSection(this.pageId, fields).subscribe({ next: result => completeSave(result.sectionId), error: failSave });
      return;
    }
    this.api.updatePageSection(section.sectionId, fields).subscribe({ next: () => completeSave(null), error: failSave });
  }

  deleteHighlight(section: SectionDraft) {
    if (!window.confirm(`Remove the “${section.sectionTitle || 'untitled'}” highlight from the home page?`)) return;
    if (section.sectionId === null) { this.highlights.update(rows => rows.filter(row => row !== section)); return; }
    this.api.deletePageSection(section.sectionId).subscribe({
      next: () => { this.highlights.update(rows => rows.filter(row => row !== section)); this.success.set('Highlight removed.'); this.error.set(''); },
      error: error => this.error.set(error.error?.message || 'Unable to remove this highlight.')
    });
  }
}
