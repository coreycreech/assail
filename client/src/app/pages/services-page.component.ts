import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ServiceFields, ServiceItem } from '../api.service';

@Component({
  selector: 'app-services-page', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="services-page">
      <div class="section-head"><div><p class="eyebrow">BILLING SETUP</p><h1>Services</h1><p>Manage the services and rates available in client billing worksheets.</p></div><button class="primary" type="button" (click)="formOpen ? cancelForm() : startCreate()">{{formOpen ? 'Close' : 'Add service'}}</button></div>
      <p class="error" *ngIf="error()" role="alert">{{error()}}</p>
      <form class="card service-form" *ngIf="formOpen" (ngSubmit)="save()">
        <div class="form-heading wide"><span class="form-icon">$</span><div><h2>{{editingId === null ? 'Add a service' : 'Edit service'}}</h2><p>The saved billing rate will be used when this service is selected on a visit.</p></div></div>
        <label>Service name<input name="serviceName" [(ngModel)]="draft.serviceName" maxlength="100" required placeholder="e.g. In-home support"></label>
        <label>Billing rate<input name="billingRate" [(ngModel)]="draft.billingRate" type="number" min="0" max="99999999.99" step="0.01" required placeholder="0.00"></label>
        <label class="wide">Description<textarea name="description" [(ngModel)]="draft.description" maxlength="500" rows="3" placeholder="Describe what this service includes"></textarea></label>
        <div class="wide form-actions"><span>Existing visits keep their recorded service name and rate.</span><div><button type="button" class="text-btn cancel" (click)="cancelForm()">Cancel</button><button class="primary" type="submit">{{editingId === null ? 'Save service' : 'Save changes'}}</button></div></div>
      </form>
      <div class="card service-list" *ngIf="services().length; else noServices">
        <div class="service-row service-list-heading"><span>Service</span><span>Description</span><span>Rate</span><span>Actions</span></div>
        <article class="service-row" *ngFor="let service of services()">
          <div><p class="eyebrow">SERVICE #{{service.serviceId}}</p><h2>{{service.serviceName}}</h2></div>
          <p class="service-description">{{service.description || 'No description provided.'}}</p>
          <strong>{{service.billingRate | currency:'USD':'symbol':'1.2-2'}}</strong>
          <div class="service-actions"><button type="button" class="event-action" (click)="edit(service)">Edit</button><button type="button" class="event-action delete-event" (click)="remove(service)">Delete</button></div>
        </article>
      </div>
      <ng-template #noServices><div class="card calendar-empty">No services yet. Add one here to make it available in billing worksheets.</div></ng-template>
    </section>`
})
export class ServicesPageComponent implements OnInit {
  services = signal<ServiceItem[]>([]);
  error = signal('');
  formOpen = false;
  editingId: number | null = null;
  draft: ServiceFields = this.emptyDraft();

  constructor(private api: ApiService) {}
  ngOnInit() { this.refresh(); }
  private emptyDraft(): ServiceFields { return { serviceName: '', billingRate: 0, description: '' }; }
  refresh() { this.api.services().subscribe({ next: rows => this.services.set(rows), error: error => this.error.set(error.error?.message || 'Unable to load services.') }); }
  startCreate() { this.editingId = null; this.draft = this.emptyDraft(); this.formOpen = true; this.error.set(''); }
  edit(service: ServiceItem) { this.editingId = service.serviceId; this.draft = { serviceName: service.serviceName, billingRate: service.billingRate, description: service.description || '' }; this.formOpen = true; this.error.set(''); }
  cancelForm() { this.formOpen = false; this.editingId = null; }
  save() {
    const fields: ServiceFields = { serviceName: this.draft.serviceName.trim(), billingRate: Number(this.draft.billingRate), description: this.draft.description?.trim() || null };
    const id = this.editingId;
    const request = id === null ? this.api.createService(fields) : this.api.updateService(id, fields);
    request.subscribe({
      next: row => { this.services.update(rows => [...rows.filter(service => service.serviceId !== row.serviceId), row].sort((a, b) => a.serviceName.localeCompare(b.serviceName))); this.cancelForm(); this.error.set(''); },
      error: error => this.error.set(error.error?.message || 'Unable to save this service. Check its name and rate.')
    });
  }
  remove(service: ServiceItem) {
    if (!window.confirm(`Delete ${service.serviceName}? Services used by billing records cannot be deleted.`)) return;
    this.api.deleteService(service.serviceId).subscribe({ next: () => this.services.update(rows => rows.filter(item => item.serviceId !== service.serviceId)), error: error => this.error.set(error.error?.message || 'Unable to delete this service.') });
  }
}
