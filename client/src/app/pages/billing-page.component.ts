import { FormModalComponent } from '../form-modal.component';
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, BillingEntry, BillingFields, ClientItem, ServiceItem } from '../api.service';

@Component({
  selector: 'app-billing-page', standalone: true, imports: [CommonModule, FormsModule, RouterLink, FormModalComponent],
  styles: [`.bill-filters{display:flex;flex-wrap:wrap;align-items:end;gap:16px;padding:20px;margin-bottom:20px}.bill-filters label{display:grid;gap:6px;flex:1 1 150px}.bill-filters select{padding:10px;min-height:44px;border:1px solid #d9e1e9;border-radius:5px;width:100%}`],
  template: `
    <section class="billing-page">
      <div class="section-head billing-heading">
        <div><p class="eyebrow">FIELD VISITS &amp; CLAIM DETAILS</p><h1>Billing worksheet</h1><p class="billing-description">Record visit information and billing details for one client at a time.</p></div>
        <div class="billing-heading-actions"><a class="event-action" routerLink="/services">Manage services</a><button class="primary" type="button" (click)="startNew()" [disabled]="!selectedClientId() || editingId !== null || !services().length">Add visit <span aria-hidden="true">+</span></button></div>
      </div>

      <p class="error" *ngIf="error()" role="alert">{{error()}}</p>
      <div class="billing-toolbar card">
        <label class="billing-client-picker">Client worksheet
          <select [disabled]="editingId !== null || saving()" name="clientId" [ngModel]="selectedClientId()" (ngModelChange)="selectClient($event)">
            <option [ngValue]="null">Select a client</option>
            <option *ngFor="let client of clients()" [ngValue]="client.clientId">{{client.clientName}} &middot; #{{client.clientId}}</option>
          </select>
        </label>
        <div class="billing-summary" *ngIf="selectedClientId()">
          <span><b>{{filteredEntries().length}}</b> {{filteredEntries().length === 1 ? 'visit' : 'visits'}}</span>
          <span><b>{{totalUnits()}}</b> units</span>
          <span><b>{{totalAmount() | currency:'USD':'symbol':'1.2-2'}}</b> recorded amount</span>
        </div>
      </div>

      <div class="card bill-filters" *ngIf="selectedClientId()">
        <label>Month<select [ngModel]="month()" (ngModelChange)="month.set($event)" [disabled]="editingId !== null || loading()"><option value="">All months</option><option *ngFor="let name of months; let index=index" [value]="monthValue(index)">{{name}}</option></select></label>
        <label>Year<select [ngModel]="year()" (ngModelChange)="year.set($event)" [disabled]="editingId !== null || loading()"><option value="">All years</option><option *ngFor="let value of years()" [value]="value">{{value}}</option></select></label>
        <label>Service / Visit<select [ngModel]="serviceFilter()" (ngModelChange)="serviceFilter.set($event)" [disabled]="editingId !== null || loading()"><option [ngValue]="null">All services / visits</option><option value="">No service / visit</option><option *ngFor="let value of serviceOptions()" [value]="value">{{value}}</option></select></label>
        <button type="button" class="event-action" (click)="clearFilters()" [disabled]="editingId !== null">Clear filters</button>
        <button type="button" class="primary" (click)="downloadBill()" [disabled]="loading() || editingId !== null || !filteredEntries().length">Download bill (HTML)</button>
      </div>
      <div class="card billing-table-card" *ngIf="clients().length && selectedClientId(); else chooseClient">
        <div class="billing-table-heading"><div><h2>{{selectedClientName()}}</h2><p>Changes are saved to this client's billing record.</p></div><span class="billing-save-hint">Select a row to edit it</span></div>
        <p class="billing-loading" *ngIf="loading()">Loading visits...</p>
        <form (ngSubmit)="saveDraft()" *ngIf="!loading()">
          <div class="billing-grid-wrap">
            <table class="billing-grid">
              <thead><tr><th scope="col">Visit date</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Service / visit</th><th scope="col">Code</th><th scope="col">Units</th><th scope="col">Rate</th><th scope="col">Amount</th><th scope="col">Field notes</th><th scope="col">Actions</th></tr></thead>
              <tbody>

                <tr *ngFor="let entry of filteredEntries()" [class.billing-edit-row]="editingId === entry.billingId">
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
          <div class="billing-empty" *ngIf="!filteredEntries().length && editingId !== 0">No visits match the selected client and filters. Clear the filters or add a visit.</div>
        </form>
      </div>

      <div class="card billing-empty" *ngIf="!services().length">No services are available yet. Add a service before entering billing visits. <a routerLink="/services">Manage services</a>.</div>
      <ng-template #chooseClient>
        <div class="card billing-empty" *ngIf="clients().length; else noClients">Choose a client above to open their worksheet.</div>
        <ng-template #noClients><div class="card billing-empty">Add a client before entering billing visits.</div></ng-template>
      </ng-template>

      <app-form-modal *ngIf="editingId === 0" label="Add billing visit" [busy]="saving()" (dismiss)="cancelEdit()">
        <p>Client: <strong>{{selectedClientName()}}</strong></p>
        <p class="error" *ngIf="error()" role="alert">{{error()}}</p>
        <form class="card client-form" (ngSubmit)="saveDraft()">
          <label>Visit date (required)<input name="visitDate" type="date" [(ngModel)]="draft.visitDate" required></label>
          <label>Service (required)<select name="serviceId" [(ngModel)]="draft.serviceId" (ngModelChange)="onServiceChange($event)" required><option [ngValue]="null">Select service</option><option *ngFor="let service of services()" [ngValue]="service.serviceId">{{service.serviceName}}</option></select></label>
          <label>Start time<input name="startTime" type="time" [(ngModel)]="draft.startTime"></label>
          <label>End time<input name="endTime" type="time" [(ngModel)]="draft.endTime"></label>
          <label>Billing code<input name="billingCode" maxlength="30" [(ngModel)]="draft.billingCode"></label>
          <label>Units (required)<input name="units" type="number" min="0.01" max="999999.99" step="0.01" [(ngModel)]="draft.units" required></label>
          <p>Rate: {{draft.rate === null ? '-' : (draft.rate | currency:'USD':'symbol':'1.2-2')}}</p>
          <p>Amount: {{calculatedAmount() | currency:'USD':'symbol':'1.2-2'}}</p>
          <label class="wide">Field notes<textarea name="notes" maxlength="65535" [(ngModel)]="draft.notes" rows="3"></textarea></label>
          <div class="wide form-actions"><button type="button" class="text-btn" (click)="cancelEdit()" [disabled]="saving()">Cancel</button><button class="primary" type="submit" [disabled]="saving()">{{saving() ? 'Saving...' : 'Save visit'}}</button></div>
        </form>
      </app-form-modal>
      <p class="billing-footnote">Amounts are calculated from units * rate. Visit records are kept with their client and cannot be removed by deleting the client.</p>
    </section>`
})
export class BillingPageComponent implements OnInit {
  clients = signal<ClientItem[]>([]);
  services = signal<ServiceItem[]>([]);
  entries = signal<BillingEntry[]>([]);
  selectedClientId = signal<number | null>(null);
  month = signal(''); year = signal(''); serviceFilter = signal<string|null>(null);
  readonly months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  years = computed(() => [...new Set(this.entries().map(row => row.visitDate.slice(0,4)))].sort().reverse());
  serviceOptions = computed(() => [...new Set(this.entries().map(row => row.serviceDescription?.trim() || '').filter(Boolean))].sort());
  filteredEntries = computed(() => this.entries().filter(row => (!this.month() || row.visitDate.slice(5,7) === this.month()) && (!this.year() || row.visitDate.slice(0,4) === this.year()) && (this.serviceFilter() === null || (row.serviceDescription?.trim() || '') === this.serviceFilter())));
  monthValue(index:number) { return String(index+1).padStart(2,'0'); }
  clearFilters() { this.month.set(''); this.year.set(''); this.serviceFilter.set(null); }

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
    this.clearFilters();
    this.entries.set([]);
    this.cancelEdit();
    this.error.set('');
    if (clientId === null) return;
    this.loading.set(true);
    this.api.billing(clientId).subscribe({
      next: rows => { if(this.selectedClientId() !== clientId)return; this.entries.set(rows); this.loading.set(false); },
      error: error => { if(this.selectedClientId() !== clientId)return; this.loading.set(false); this.error.set(error.error?.message || "Unable to load this client's billing worksheet."); }
    });
  }

  selectedClientName() { return this.clients().find(client => client.clientId === this.selectedClientId())?.clientName || 'Client worksheet'; }
  onServiceChange(serviceId: number | null) {
    const service = this.services().find(item => item.serviceId === Number(serviceId));
    this.draft.serviceDescription = service?.serviceName || '';
    this.draft.rate = service?.billingRate ?? null;
  }
  displayDate(date: string) { const [year, month, day] = date.split('-'); return `${month}/${day}/${year}`; }
  totalUnits() { return Math.round(this.filteredEntries().reduce((total, entry) => total + Number(entry.units || 0), 0)*100)/100; }
  totalAmount() { return this.filteredEntries().reduce((total, entry) => total + Math.round(Number(entry.amount || 0)*100), 0)/100; }
  calculatedAmount() { return this.draft.rate === null || this.draft.rate === undefined ? null : Math.round(Number(this.draft.units || 0) * Number(this.draft.rate) * 100) / 100; }

  downloadBill() {
    const client = this.clients().find(item => item.clientId === this.selectedClientId());
    const rows = this.filteredEntries();
    if (!client || !rows.length || this.loading() || this.editingId !== null) return;
    const escape = (value:unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
    const money = (value:unknown) => value === null || value === undefined ? 'Not recorded' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
    const filterDescription = `${this.month() ? this.months[Number(this.month())-1] : 'All months'} / ${this.year() || 'All years'} / ${this.serviceFilter() === null ? 'All services / visits' : this.serviceFilter() || 'No service / visit'}`;
    const items = rows.map(row => `<tr><td>${escape(this.displayDate(row.visitDate))}</td><td>${escape(row.startTime || '-')} – ${escape(row.endTime || '-')}</td><td>${escape(row.serviceDescription)}</td><td>${escape(row.billingCode || '-')}</td><td>${escape(row.units)}</td><td>${escape(money(row.rate))}</td><td>${escape(money(row.amount))}</td></tr>`).join('');
    const address = [client.address,[client.city,client.state,client.zip].filter(Boolean).join(' ')].filter(Boolean).map(escape).join('<br>');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bill - ${escape(client.clientName)}</title><style>body{font:15px Arial,sans-serif;color:#16354b;max-width:1100px;margin:32px auto;padding:16px}h1{margin-bottom:8px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #ccd7df}th{background:#eef6fa}td{overflow-wrap:anywhere}.total{text-align:right;font-size:20px}small{color:#52647d}@media print{body{margin:0;max-width:none;font-size:11px}.table-wrap{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:6px}}</style></head><body><h1>Assail Health Care</h1><h2>Client bill</h2><p><strong>Bill to: ${escape(client.clientName)}</strong><br>${address}</p><p>Filters: ${escape(filterDescription)}<br>Generated: ${escape(new Date().toLocaleDateString('en-US'))}</p><div class="table-wrap"><table><thead><tr><th>Date</th><th>Visit time</th><th>Service</th><th>Code</th><th>Units</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${items}</tbody></table></div><p>${rows.length} visits · ${this.totalUnits()} units</p><p class="total"><strong>Total recorded charges: ${money(this.totalAmount())}</strong></p>${rows.some(row => row.amount === null) ? '<p>Some visits have no recorded amount and are excluded from the total.</p>' : ''}<small>This bill reflects the saved visits matching the filters above. Payments and outstanding balances are not tracked here. Use your browser’s Print option to print or save as PDF.</small></body></html>`;
    const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bill-${client.clientName.replace(/[^a-z0-9_-]/gi,'_')}-${this.year() || 'all-years'}-${this.month() || 'all-months'}.html`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

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
    if (this.saving() || clientId === null || this.draft.serviceId === null) return;
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
