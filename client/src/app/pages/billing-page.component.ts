import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, BillingEntry, BillingFields, ClientItem, ServiceItem } from '../api.service';

@Component({
  selector: 'app-billing-page', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="billing-page">
      <div class="section-head billing-heading">
        <div><p class="eyebrow">FIELD VISITS &amp; CLAIM DETAILS</p><h1>Billing worksheet</h1><p class="billing-description">Record visit information and billing details for one client at a time.</p></div>
        <div class="billing-heading-actions"><a class="event-action" routerLink="/services">Manage services</a><button class="primary" type="button" (click)="startNew()" [disabled]="!selectedClientId() || editingId !== null || !services().length">Add visit <span aria-hidden="true">+</span></button></div>
      </div>

      <p class="error" *ngIf="error()" role="alert">{{error()}}</p>
      <div class="billing-toolbar card">
        <label class="billing-client-picker">Client worksheet
          <select name="clientId" [ngModel]="selectedClientId()" (ngModelChange)="selectClient($event)">
            <option [ngValue]="null">Select a client</option>
            <option *ngFor="let client of clients()" [ngValue]="client.clientId">{{client.clientName}} &middot; #{{client.clientId}}</option>
          </select>
        </label>
        <div class="billing-summary" *ngIf="selectedClientId()">
          <span><b>{{entries().length}}</b> {{entries().length === 1 ? 'visit' : 'visits'}}</span>
          <span><b>{{totalUnits()}}</b> units</span>
          <span><b>{{totalAmount() | currency:'USD':'symbol':'1.2-2'}}</b> recorded amount</span>
        </div>
      </div>

      <div class="card billing-table-card" *ngIf="clients().length && selectedClientId(); else chooseClient">
        <div class="billing-table-heading"><div><h2>{{selectedClientName()}}</h2><p>Changes are saved to this client's billing record.</p></div><span class="billing-save-hint">Select a row to edit it</span></div>
        <p class="billing-loading" *ngIf="loading()">Loading visits...</p>
        <form (ngSubmit)="saveDraft()" *ngIf="!loading()">
          <div class="billing-grid-wrap">
            <table class="billing-grid">
              <thead><tr><th scope="col">Visit date</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Service / visit</th><th scope="col">Code</th><th scope="col">Units</th><th scope="col">Rate</th><th scope="col">Amount</th><th scope="col">Field notes</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                <tr class="billing-edit-row" *ngIf="editingId === 0">
                  <td><input aria-label="Visit date" name="visitDate" type="date" [(ngModel)]="draft.visitDate" required></td>
                  <td><input aria-label="Start time" name="startTime" type="time" [(ngModel)]="draft.startTime"></td>
                  <td><input aria-label="End time" name="endTime" type="time" [(ngModel)]="draft.endTime"></td>
                  <td><select aria-label="Service" name="serviceId" [(ngModel)]="draft.serviceId" (ngModelChange)="onServiceChange($event)" required><option [ngValue]="null">Select service</option><option *ngFor="let service of services()" [ngValue]="service.serviceId">{{service.serviceName}}</option></select></td>
                  <td><input aria-label="Billing code" name="billingCode" maxlength="30" [(ngModel)]="draft.billingCode" placeholder="Code"></td>
                  <td><input aria-label="Units" name="units" type="number" min="0.01" max="999999.99" step="0.01" [(ngModel)]="draft.units" required></td>
                  <td class="billing-money">{{draft.rate === null ? '-' : (draft.rate | currency:'USD':'symbol':'1.2-2')}}</td>
                  <td class="billing-money">{{calculatedAmount() | currency:'USD':'symbol':'1.2-2'}}</td>
                  <td><textarea aria-label="Field notes" name="notes" maxlength="65535" [(ngModel)]="draft.notes" rows="2" placeholder="Notes from the visit"></textarea></td>
                  <td class="billing-actions"><button class="primary billing-save" type="submit" [disabled]="saving()">Save</button><button class="event-action" type="button" (click)="cancelEdit()">Cancel</button></td>
                </tr>
                <tr *ngFor="let entry of entries()" [class.billing-edit-row]="editingId === entry.billingId">
                  <ng-container *ngIf="editingId === entry.billingId; else readOnlyRow">
                    <td><input aria-label="Visit date" name="visitDate" type="date" [(ngModel)]="draft.visitDate" required></td>
                    <td><input aria-label="Start time" name="startTime" type="time" [(ngModel)]="draft.startTime"></td>
                    <td><input aria-label="End time" name="endTime" type="time" [(ngModel)]="draft.endTime"></td>
                    <td><select aria-label="Service" name="serviceId" [(ngModel)]="draft.serviceId" (ngModelChange)="onServiceChange($event)" required><option [ngValue]="null">Select service</option><option *ngFor="let service of services()" [ngValue]="service.serviceId">{{service.serviceName}}</option></select></td>
                    <td><input aria-label="Billing code" name="billingCode" maxlength="30" [(ngModel)]="draft.billingCode"></td>
                    <td><input aria-label="Units" name="units" type="number" min="0.01" max="999999.99" step="0.01" [(ngModel)]="draft.units" required></td>
                    <td class="billing-money">{{draft.rate === null ? '-' : (draft.rate | currency:'USD':'symbol':'1.2-2')}}</td>
                    <td class="billing-money">{{calculatedAmount() | currency:'USD':'symbol':'1.2-2'}}</td>
                    <td><textarea aria-label="Field notes" name="notes" maxlength="65535" [(ngModel)]="draft.notes" rows="2"></textarea></td>
                    <td class="billing-actions"><button class="primary billing-save" type="submit" [disabled]="saving()">Save</button><button class="event-action" type="button" (click)="cancelEdit()">Cancel</button></td>
                  </ng-container>
                  <ng-template #readOnlyRow>
                    <td>{{displayDate(entry.visitDate)}}</td><td>{{entry.startTime || '-'}}</td><td>{{entry.endTime || '-'}}</td><td class="billing-service">{{entry.serviceDescription}}</td><td>{{entry.billingCode || '-'}}</td><td>{{entry.units}}</td><td>{{entry.rate === null ? '-' : (entry.rate | currency:'USD':'symbol':'1.2-2')}}</td><td class="billing-money">{{entry.amount === null ? '-' : (entry.amount | currency:'USD':'symbol':'1.2-2')}}</td><td class="billing-notes">{{entry.notes || '-'}}</td>
                    <td class="billing-actions"><button class="event-action" type="button" (click)="startEdit(entry)">Edit</button><button class="event-action delete-event" type="button" (click)="deleteEntry(entry)">Delete</button></td>
                  </ng-template>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="billing-empty" *ngIf="!entries().length && editingId !== 0">No visits are recorded for this client yet. Select <b>Add visit</b> to enter the first row.</div>
        </form>
      </div>

      <div class="card billing-empty" *ngIf="!services().length">No services are available yet. Add a service before entering billing visits. <a routerLink="/services">Manage services</a>.</div>
      <ng-template #chooseClient>
        <div class="card billing-empty" *ngIf="clients().length; else noClients">Choose a client above to open their worksheet.</div>
        <ng-template #noClients><div class="card billing-empty">Add a client before entering billing visits.</div></ng-template>
      </ng-template>
      <p class="billing-footnote">Amounts are calculated from units * rate. Visit records are kept with their client and cannot be removed by deleting the client.</p>
    </section>`
})
export class BillingPageComponent implements OnInit {
  clients = signal<ClientItem[]>([]);
  services = signal<ServiceItem[]>([]);
  entries = signal<BillingEntry[]>([]);
  selectedClientId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  editingId: number | null = null;
  draft: BillingFields = this.emptyDraft();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.services().subscribe({ next: rows => this.services.set(rows), error: error => this.error.set(error.error?.message || 'Unable to load services.') });
    this.api.clients().subscribe({
      next: clients => {
        this.clients.set(clients);
        if (clients.length) this.selectClient(clients[0].clientId);
      },
      error: error => this.error.set(error.error?.message || 'Unable to load clients.')
    });
  }

  private emptyDraft(): BillingFields {
    const now = new Date();
    const visitDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { visitDate, startTime: '', endTime: '', serviceId: null, serviceDescription: '', billingCode: '', units: 1, rate: null, amount: null, notes: '' };
  }

  selectClient(clientId: number | null) {
    this.selectedClientId.set(clientId);
    this.entries.set([]);
    this.cancelEdit();
    this.error.set('');
    if (clientId === null) return;
    this.loading.set(true);
    this.api.billing(clientId).subscribe({
      next: rows => { this.entries.set(rows); this.loading.set(false); },
      error: error => { this.loading.set(false); this.error.set(error.error?.message || "Unable to load this client's billing worksheet."); }
    });
  }

  selectedClientName() { return this.clients().find(client => client.clientId === this.selectedClientId())?.clientName || 'Client worksheet'; }
  onServiceChange(serviceId: number | null) {
    const service = this.services().find(item => item.serviceId === Number(serviceId));
    this.draft.serviceDescription = service?.serviceName || '';
    this.draft.rate = service?.billingRate ?? null;
  }
  displayDate(date: string) { const [year, month, day] = date.split('-'); return `${month}/${day}/${year}`; }
  totalUnits() { return this.entries().reduce((total, entry) => total + Number(entry.units || 0), 0); }
  totalAmount() { return this.entries().reduce((total, entry) => total + Number(entry.amount || 0), 0); }
  calculatedAmount() { return this.draft.rate === null || this.draft.rate === undefined ? null : Math.round(Number(this.draft.units || 0) * Number(this.draft.rate) * 100) / 100; }

  startNew() { this.error.set(''); this.draft = this.emptyDraft(); this.editingId = 0; }
  startEdit(entry: BillingEntry) {
    this.error.set('');
    this.editingId = entry.billingId;
    const currentServiceRate = this.services().find(service => service.serviceId === entry.serviceId)?.billingRate;
    this.draft = { visitDate: entry.visitDate, startTime: entry.startTime || '', endTime: entry.endTime || '', serviceId: entry.serviceId, serviceDescription: entry.serviceDescription, billingCode: entry.billingCode || '', units: entry.units, rate: currentServiceRate ?? entry.rate, amount: entry.amount, notes: entry.notes || '' };
  }
  cancelEdit() { this.editingId = null; this.draft = this.emptyDraft(); }

  saveDraft() {
    const clientId = this.selectedClientId();
    if (clientId === null || this.draft.serviceId === null) return;
    const fields: BillingFields = {
      ...this.draft,
      serviceDescription: this.draft.serviceDescription.trim(),
      billingCode: this.draft.billingCode?.trim() || null,
      notes: this.draft.notes?.trim() || null,
      amount: this.calculatedAmount()
    };
    const editingId = this.editingId;
    if (editingId === null) return;
    this.saving.set(true);
    const request = editingId === 0 ? this.api.createBilling(clientId, fields) : this.api.updateBilling(editingId, fields);
    request.subscribe({
      next: saved => {
        this.entries.update(rows => [saved, ...rows.filter(row => row.billingId !== saved.billingId)].sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.billingId - a.billingId));
        this.cancelEdit(); this.saving.set(false); this.error.set('');
      },
      error: error => { this.saving.set(false); this.error.set(error.error?.message || 'Unable to save this visit. Check the visit date, time, units, and billing details.'); }
    });
  }

  deleteEntry(entry: BillingEntry) {
    if (!window.confirm(`Delete the ${entry.serviceDescription} visit from ${this.displayDate(entry.visitDate)}?`)) return;
    this.api.deleteBilling(entry.billingId).subscribe({
      next: () => this.entries.update(rows => rows.filter(row => row.billingId !== entry.billingId)),
      error: error => this.error.set(error.error?.message || 'Unable to delete this visit.')
    });
  }
}
