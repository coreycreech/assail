import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ResourceFields, ResourceItem } from '../api.service';

@Component({
  selector: 'app-resources-page', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section>
      <p class="error" *ngIf="error()">{{error()}}</p>
      <div class="section-head"><div><p class="eyebrow">CARE DIRECTORY</p><h2>Resources</h2></div><button class="primary" type="button" (click)="resourceFormOpen ? cancelResourceForm() : startCreateResource()">{{resourceFormOpen ? 'Close' : 'Add resource'}}</button></div>
      <form class="card client-form resource-form" *ngIf="resourceFormOpen" (ngSubmit)="saveResource()">
        <div class="form-heading wide"><span class="form-icon">+</span><div><h3>{{editingResourceId === undefined ? 'Add a resource' : 'Edit resource'}}</h3><p>Enter contact details for a care resource. All fields are optional.</p></div></div>
        <p class="wide client-id-note" *ngIf="editingResourceId === undefined">Resource ID will be assigned automatically when you save.</p><p class="wide client-id-note" *ngIf="editingResourceId !== undefined">Resource ID: #{{editingResourceId}} (cannot be changed)</p>
        <label>Name<input name="name" [(ngModel)]="resourceDraft.name" maxlength="45" placeholder="Resource name"></label>
        <label>Phone<input name="phone" [(ngModel)]="resourceDraft.phone" maxlength="15" type="tel" placeholder="Phone number"></label>
        <label class="wide">Address line 1<input name="address1" [(ngModel)]="resourceDraft.address1" maxlength="45" placeholder="Street address"></label>
        <label class="wide">Address line 2<input name="address2" [(ngModel)]="resourceDraft.address2" maxlength="45" placeholder="Suite, unit, etc."></label>
        <label>City<input name="city" [(ngModel)]="resourceDraft.city" maxlength="45" placeholder="City"></label>
        <label>State<input name="state" [(ngModel)]="resourceDraft.state" maxlength="2" placeholder="Two-letter state"></label>
        <label>ZIP code<input name="zip" [(ngModel)]="resourceDraft.zip" maxlength="15" placeholder="ZIP code"></label>
        <label>Website URL<input name="Url" [(ngModel)]="resourceDraft.Url" maxlength="100" type="url" placeholder="https://example.com"></label>
        <div class="wide form-actions"><span>Resource ID is automatically generated.</span><div><button type="button" class="text-btn cancel" (click)="cancelResourceForm()">Cancel</button><button class="primary" type="submit">{{editingResourceId === undefined ? 'Save resource' : 'Save changes'}}</button></div></div>
      </form>
      <div class="client-list" *ngIf="resources().length; else noResources"><article class="card client-record" *ngFor="let resource of resources()">
        <div class="client-record-heading"><div><p class="eyebrow">RESOURCE #{{resource.resourceId}}</p><h3>{{resource.name || 'Unnamed resource'}}</h3></div><div class="client-record-actions"><button type="button" class="event-action" (click)="editResource(resource)">Edit</button><button type="button" class="event-action delete-event" (click)="deleteResource(resource)">Delete</button></div></div>
        <div class="client-details resource-details"><p><b>Phone</b><span>{{resource.phone || 'Not provided'}}</span></p><p><b>Address</b><span>{{resource.address1 || 'Not provided'}}<ng-container *ngIf="resource.address2">, {{resource.address2}}</ng-container></span></p><p><b>City</b><span>{{resource.city || 'Not provided'}}</span></p><p><b>State</b><span>{{resource.state || 'Not provided'}}</span></p><p><b>ZIP code</b><span>{{resource.zip || 'Not provided'}}</span></p><p><b>Website</b><span><a *ngIf="resource.Url" [href]="resource.Url" target="_blank" rel="noopener noreferrer">{{resource.Url}}</a><ng-container *ngIf="!resource.Url">Not provided</ng-container></span></p></div>
      </article></div>
      <ng-template #noResources><div class="card calendar-empty">No resources yet. Select Add resource to create the first record.</div></ng-template>
    </section>`
})
export class ResourcesPageComponent implements OnInit {
  resources = signal<ResourceItem[]>([]);
  error = signal('');
  resourceFormOpen = false;
  editingResourceId?: number;
  resourceDraft: ResourceFields = this.emptyResource();
  constructor(private api: ApiService) {}
  ngOnInit() { this.refresh(); }
  private emptyResource(): ResourceFields { return { name: '', phone: '', address1: '', address2: '', city: '', state: '', zip: '', Url: '' }; }
  refresh() { this.api.resources().subscribe({ next: rows => this.resources.set(rows), error: () => this.error.set('Unable to load resources.') }); }
  startCreateResource() { this.editingResourceId = undefined; this.resourceDraft = this.emptyResource(); this.resourceFormOpen = true; this.error.set(''); }
  editResource(resource: ResourceItem) {
    this.editingResourceId = resource.resourceId;
    this.resourceDraft = { name: resource.name || '', phone: resource.phone || '', address1: resource.address1 || '', address2: resource.address2 || '', city: resource.city || '', state: resource.state || '', zip: resource.zip || '', Url: resource.Url || '' };
    this.resourceFormOpen = true; this.error.set('');
  }
  cancelResourceForm() { this.resourceFormOpen = false; this.editingResourceId = undefined; }
  saveResource() {
    const fields: ResourceFields = {
      name: this.resourceDraft.name?.trim() || null, phone: this.resourceDraft.phone?.trim() || null,
      address1: this.resourceDraft.address1?.trim() || null, address2: this.resourceDraft.address2?.trim() || null,
      city: this.resourceDraft.city?.trim() || null, state: this.resourceDraft.state?.trim() || null,
      zip: this.resourceDraft.zip?.trim() || null, Url: this.resourceDraft.Url?.trim() || null
    };
    const id = this.editingResourceId;
    const request = id === undefined ? this.api.createResource(fields) : this.api.updateResource(id, fields);
    request.subscribe({
      next: row => { this.resources.update(items => [...items.filter(item => item.resourceId !== row.resourceId), row].sort((a, b) => (a.name || '').localeCompare(b.name || ''))); this.cancelResourceForm(); this.error.set(''); },
      error: error => this.error.set(error.error?.message || 'Unable to save resource. Please try again.')
    });
  }
  deleteResource(resource: ResourceItem) {
    if (!window.confirm(`Delete ${resource.name || `resource #${resource.resourceId}`}? This cannot be undone.`)) return;
    this.api.deleteResource(resource.resourceId).subscribe({ next: () => this.resources.update(items => items.filter(item => item.resourceId !== resource.resourceId)), error: () => this.error.set('Unable to delete resource. Please try again.') });
  }
}
