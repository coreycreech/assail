import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, PageFields, PageInfo, PageSection, PageSectionFields, PageSectionImage } from '../api.service';
import { AuthService } from '../auth.service';

interface SectionDraft {
  sectionId: number | null;
  sectionTitle: string;
  sectionInfo: string;
  imageLocation: string;
  saving: boolean;
  uploading: boolean;
  editing: boolean;
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
          <label>Our Services introduction<textarea name="servicesIntro" [(ngModel)]="servicesIntro" maxlength="500" rows="3" placeholder="Add a short introduction above the Home page service list"></textarea></label>
          <div class="home-editor-actions"><span>Up to 50 characters for the headline and 500 for the supporting copy.</span><button class="primary" type="submit" [disabled]="saving()">{{saving() ? 'Saving...' : 'Save home page'}}</button></div>
        </form>

        <section class="card home-highlight-editor">
          <div class="home-editor-section-heading"><div><p class="eyebrow">OPTIONAL CONTENT</p><h2>Page sections</h2><p>Choose a page to view and manage its optional content sections.</p></div><button type="button" class="primary" (click)="addHighlight()" [disabled]="!sectionPageId()">Add section</button></div>
          <label class="page-section-picker">Page
            <select name="sectionPageId" [ngModel]="sectionPageId()" (ngModelChange)="selectSectionPage($event)">
              <option [ngValue]="null">Select a page</option>
              <option *ngFor="let page of pages()" [ngValue]="page.pageId">{{page.name}} — {{page.title}}</option>
            </select>
          </label>
          <p class="client-id-note" *ngIf="!pages().length">No pages are available in PageInfo.</p>
          <p class="client-id-note" *ngIf="sectionsLoading()">Loading sections…</p>
          <div class="page-section-list" *ngIf="highlights().length">
            <article class="page-section-list-item" *ngFor="let section of highlights(); let i = index">
              <ng-container *ngIf="!section.editing; else sectionEditor">
                <div class="page-section-summary"><img class="page-section-thumb" *ngIf="section.imageLocation" [src]="section.imageLocation" [alt]="section.sectionTitle"><div class="page-section-summary-copy"><h3>{{section.sectionTitle}}</h3><p>{{section.sectionInfo}}</p></div><div class="home-highlight-edit-actions"><button class="event-action" type="button" (click)="editHighlight(section)">Edit</button><button class="event-action delete-event" type="button" (click)="deleteHighlight(section)">Remove</button></div></div>
              </ng-container>
              <ng-template #sectionEditor>
                <div class="home-highlight-edit-row">
                  <label>Section title<input [name]="'sectionTitle' + i" [(ngModel)]="section.sectionTitle" maxlength="50" required></label>
                  <label>Section text<textarea [name]="'sectionInfo' + i" [(ngModel)]="section.sectionInfo" maxlength="500" rows="3" required></textarea></label>
                  <div class="section-image-field">
                    <label [for]="'imageLocation' + i">Image location</label>
                    <input [id]="'imageLocation' + i" [name]="'imageLocation' + i" [(ngModel)]="section.imageLocation" maxlength="500" placeholder="Paste an image URL or choose below">
                    <label [for]="'savedImage' + i">Choose an existing image</label>
                    <select [id]="'savedImage' + i" [name]="'savedImage' + i" [(ngModel)]="section.imageLocation">
                      <option value="">Select from image folder...</option>
                      <option *ngFor="let image of imageOptions()" [ngValue]="image.imageLocation">{{image.fileName}} ({{image.source}})</option>
                    </select>
                    <label [for]="'uploadImage' + i">Upload a new image</label>
                    <input [id]="'uploadImage' + i" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif" (change)="uploadSectionImage($event, section)" [disabled]="section.uploading">
                    <small>PNG, JPEG, WebP, or GIF. Maximum file size: 5 MB. Uploaded images are stored by the site.</small>
                    <p class="upload-status" *ngIf="section.uploading" role="status">Uploading image...</p>
                    <img *ngIf="section.imageLocation" class="page-section-preview" [src]="section.imageLocation" [alt]="section.sectionTitle">
                  </div>
                  <div class="home-highlight-edit-actions">
                    <button class="event-action" type="button" (click)="saveHighlight(section)" [disabled]="section.saving || section.uploading">{{section.saving ? 'Saving...' : 'Save section'}}</button>
                    <button class="event-action" type="button" (click)="cancelHighlight(section)" [disabled]="section.saving || section.uploading">Cancel</button>
                    <button class="event-action delete-event" type="button" (click)="deleteHighlight(section)" [disabled]="section.uploading">Remove</button>
                  </div>
                </div>
              </ng-template>
            </article>
          </div>
          <p class="calendar-empty" *ngIf="sectionPageId() && !sectionsLoading() && !highlights().length">This page has no optional sections yet. Select Add section to create one.</p>
        </section>
      </ng-container>

      <ng-template #publicAbout>
        <section class="public-about-page">
          <p class="eyebrow">ABOUT ASSAIL HEALTH CARE</p><h1>{{title}}</h1><p class="public-about-copy">{{information}}</p>
          <div class="home-highlight-grid" *ngIf="highlights().length"><article class="card home-highlight" [class.home-highlight-with-image]="!!section.imageLocation" *ngFor="let section of highlights()"><img class="page-section-thumb" *ngIf="section.imageLocation" [src]="section.imageLocation" [alt]="section.sectionTitle"><span class="home-highlight-mark" *ngIf="!section.imageLocation" aria-hidden="true">+</span><div><h2>{{section.sectionTitle}}</h2><p>{{section.sectionInfo}}</p></div></article></div>
          <div class="public-about-admin" *ngIf="auth.currentUser(); else signInPrompt"><span>Care team member?</span><a class="primary" routerLink="/admin/content">Edit home page</a></div>
          <ng-template #signInPrompt><div class="public-about-admin"><span>Care team member?</span><a class="primary" routerLink="/login">Sign in to edit this page</a></div></ng-template>
        </section>
      </ng-template>
    </section>`
})
export class ContentPageComponent implements OnInit {
  readonly isEditorPage: boolean;
  pageId: number | null = null;
  pages = signal<PageInfo[]>([]);
  sectionPageId = signal<number | null>(null);
  imageOptions = signal<PageSectionImage[]>([]);
  title = 'Health care created with you in mind';
  information = 'We bring care, appointments, and trusted resources together in a clear, accessible experience designed around you.';
  servicesIntro = '';
  highlights = signal<SectionDraft[]>([]);
  sectionsLoading = signal(false);
  saving = signal(false);
  success = signal('');
  error = signal('');

  constructor(readonly auth: AuthService, private api: ApiService, router: Router) {
    this.isEditorPage = router.url.split('?')[0].replace(/\/$/, '') === '/admin/content';
  }

  ngOnInit() {
    if (this.isEditorPage && this.auth.currentUser()) {
      this.api.pageSectionImages().subscribe({
        next: images => this.imageOptions.set(images),
        error: error => this.error.set(error.error?.message || 'Unable to load existing images.')
      });
    }
    this.api.pages().subscribe({
      next: pages => {
        this.pages.set(pages);
        const home: PageInfo | undefined = pages.find(page => page.name.trim().toLowerCase() === 'home');
        if (home) {
          this.pageId = home.pageId;
          this.title = home.title.trim();
          this.information = home.information;
          this.servicesIntro = home.servicesIntro || '';
        }
        const initialPage = home || pages[0];
        if (initialPage) this.selectSectionPage(initialPage.pageId);
      },
      error: error => this.error.set(error.error?.message || 'Unable to load home page content.')
    });
  }

  private loadHighlights(pageId: number) {
    this.sectionsLoading.set(true);
    this.api.pageSections(pageId).subscribe({
      next: sections => {
        if (this.sectionPageId() !== pageId) return;
        this.highlights.set(sections.map((section: PageSection) => ({ sectionId: section.sectionId, sectionTitle: section.sectionTitle.trim(), sectionInfo: section.sectionInfo, imageLocation: section.imageLocation || '', saving: false, uploading: false, editing: false })));
        this.sectionsLoading.set(false);
      },
      error: error => { if (this.sectionPageId() === pageId) { this.sectionsLoading.set(false); this.error.set(error.error?.message || 'Unable to load page sections.'); } }
    });
  }

  selectSectionPage(pageId: number | string | null) {
    const id = pageId === null || pageId === '' ? null : Number(pageId);
    this.sectionPageId.set(id);
    this.highlights.set([]);
    this.sectionsLoading.set(false);
    this.error.set('');
    if (id !== null && Number.isInteger(id) && id > 0) this.loadHighlights(id);
  }

  saveHome() {
    const title = this.title.trim();
    const information = this.information.trim();
    if (!title || !information) { this.error.set('Enter both a headline and supporting copy.'); return; }
    const fields: PageFields = { name: 'home', title, information, servicesIntro: this.servicesIntro.trim() };
    this.saving.set(true); this.error.set(''); this.success.set('');
    const handleError = (error: any) => { this.saving.set(false); this.error.set(error.error?.message || 'Unable to save the home page. Please try again.'); };
    if (this.pageId === null) {
      this.api.createPage(fields).subscribe({
        next: page => {
          this.pageId = page.pageId;
          this.pages.update(pages => [...pages.filter(item => item.pageId !== page.pageId), page]);
          if (this.sectionPageId() === null) this.selectSectionPage(page.pageId);
          this.saving.set(false); this.success.set('Home page content saved.');
        },
        error: handleError
      });
      return;
    }
    this.api.updatePage(this.pageId, fields).subscribe({
      next: () => {
        this.pages.update(pages => pages.map(page => page.pageId === this.pageId ? { ...page, title, information, servicesIntro: fields.servicesIntro } : page));
        this.saving.set(false); this.success.set('Home page content saved.');
      },
      error: handleError
    });
  }

  addHighlight() {
    if (this.sectionPageId() === null) { this.error.set('Select a page before adding a section.'); return; }
    this.highlights.update(rows => [...rows, { sectionId: null, sectionTitle: '', sectionInfo: '', imageLocation: '', saving: false, uploading: false, editing: true }]);
    this.error.set(''); this.success.set('');
  }

  saveHighlight(section: SectionDraft) {
    const pageId = this.sectionPageId();
    if (pageId === null || !section.sectionTitle.trim() || !section.sectionInfo.trim()) { this.error.set('Select a page and enter a section title and text.'); return; }
    const fields: PageSectionFields = { sectionTitle: section.sectionTitle.trim(), sectionInfo: section.sectionInfo.trim(), imageLocation: section.imageLocation.trim() || null };
    section.saving = true; this.error.set(''); this.success.set('');
    const completeSave = (sectionId: number | null) => {
      if (sectionId !== null) section.sectionId = sectionId;
      section.editing = false;
      section.saving = false; this.highlights.update(rows => [...rows]); this.success.set('Section saved.');
    };
    const failSave = (error: any) => { section.saving = false; this.highlights.update(rows => [...rows]); this.error.set(error.error?.message || 'Unable to save this section.'); };
    if (section.sectionId === null) {
      this.api.createPageSection(pageId, fields).subscribe({ next: result => completeSave(result.sectionId), error: failSave });
      return;
    }
    this.api.updatePageSection(section.sectionId, fields).subscribe({ next: () => completeSave(null), error: failSave });
  }

  editHighlight(section: SectionDraft) { section.editing = true; this.highlights.update(rows => [...rows]); }

  uploadSectionImage(event: Event, section: SectionDraft) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    section.uploading = true; this.error.set('');
    this.api.uploadPageSectionImage(file).subscribe({
      next: image => {
        section.imageLocation = image.imageLocation;
        this.imageOptions.update(images => [...images.filter(item => item.imageLocation !== image.imageLocation), image].sort((a, b) => a.fileName.localeCompare(b.fileName)));
        section.uploading = false; this.highlights.update(rows => [...rows]);
      },
      error: error => { section.uploading = false; this.highlights.update(rows => [...rows]); this.error.set(error.error?.message || 'Unable to upload this image.'); },
      complete: () => { input.value = ''; }
    });
  }

  cancelHighlight(section: SectionDraft) {
    if (section.sectionId === null) {
      this.highlights.update(rows => rows.filter(row => row !== section));
      return;
    }
    const pageId = this.sectionPageId();
    if (pageId !== null) this.loadHighlights(pageId);
  }

  deleteHighlight(section: SectionDraft) {
    if (!window.confirm('Remove this section from the selected page?')) return;
    if (section.sectionId === null) { this.highlights.update(rows => rows.filter(row => row !== section)); return; }
    this.api.deletePageSection(section.sectionId).subscribe({
      next: () => { this.highlights.update(rows => rows.filter(row => row !== section)); this.success.set('Section removed.'); this.error.set(''); },
      error: error => this.error.set(error.error?.message || 'Unable to remove this section.')
    });
  }
}
