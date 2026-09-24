import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ClientFields, ClientItem } from '../api.service';

@Component({
  selector: 'app-clients-page', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section>
      <p class="error" *ngIf="error()">{{error()}}</p>
      <div class="section-head"><div><p class="eyebrow">CLIENT DIRECTORY</p><h2>Clients</h2></div><button class="primary" type="button" (click)="clientFormOpen ? cancelClientForm() : startCreateClient()">{{clientFormOpen ? 'Close' : 'Add client'}}</button></div>
      <form class="card client-form" *ngIf="clientFormOpen" (ngSubmit)="saveClient()">
        <div class="form-heading wide"><span class="form-icon">+</span><div><h3>{{editingClientId === undefined ? 'Add a client' : 'Edit client'}}</h3><p>Enter the client's details for the care record.</p></div></div>
        <p class="wide client-id-note" *ngIf="editingClientId === undefined">Client ID will be assigned automatically when you save.</p><p class="wide client-id-note" *ngIf="editingClientId !== undefined">Client ID: #{{editingClientId}} (cannot be changed)</p>
        <label>Client name<input name="clientName" [(ngModel)]="clientDraft.clientName" maxlength="45" required placeholder="Client name"></label>
        <label class="wide">Address<input name="address" [(ngModel)]="clientDraft.address" maxlength="45" placeholder="Street address"></label>
        <label>City<input name="city" [(ngModel)]="clientDraft.city" maxlength="45" placeholder="City"></label>
        <label>State<select name="state" [(ngModel)]="clientDraft.state"><option value="">Select a state</option><option *ngFor="let state of usStates" [value]="state.code">{{state.name}} ({{state.code}})</option></select></label>
        <label>ZIP code<input name="zip" [(ngModel)]="clientDraft.zip" maxlength="15" placeholder="ZIP code"></label>
        <div class="wide form-actions"><span>Client ID is automatically generated and cannot be changed.</span><div><button type="button" class="text-btn cancel" (click)="cancelClientForm()">Cancel</button><button class="primary" type="submit">{{editingClientId === undefined ? 'Save client' : 'Save changes'}}</button></div></div>
      </form>
      <div class="client-list" *ngIf="clients().length; else noClients"><article class="card client-record" *ngFor="let client of clients()">
        <div class="client-record-heading"><div><p class="eyebrow">CLIENT #{{client.clientId}}</p><h3>{{client.clientName}}</h3></div><div class="client-record-actions"><button type="button" class="event-action" (click)="editClient(client)">Edit</button><button type="button" class="event-action delete-event" (click)="deleteClientRecord(client)">Delete</button></div></div>
        <div class="client-details"><p><b>Address</b><span>{{client.address || 'Not provided'}}</span></p><p><b>City</b><span>{{client.city || 'Not provided'}}</span></p><p><b>State</b><span>{{client.state || 'Not provided'}}</span></p><p><b>ZIP code</b><span>{{client.zip || 'Not provided'}}</span></p></div>
      </article></div>
      <ng-template #noClients><div class="card calendar-empty">No clients yet. Select Add client to create the first record.</div></ng-template>
    </section>`
})
export class ClientsPageComponent implements OnInit {
  readonly usStates = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
  ];
  clients = signal<ClientItem[]>([]);
  error = signal('');
  clientFormOpen = false;
  editingClientId?: number;
  clientDraft: ClientFields = this.emptyClient();
  constructor(private api: ApiService) {}
  ngOnInit() { this.refresh(); }
  private emptyClient(): ClientFields { return { clientName: '', address: '', city: '', state: '', zip: '' }; }
  refresh() { this.api.clients().subscribe({ next: rows => this.clients.set(rows), error: () => this.error.set('Unable to load clients.') }); }
  startCreateClient() { this.editingClientId = undefined; this.clientDraft = this.emptyClient(); this.clientFormOpen = true; this.error.set(''); }
  editClient(client: ClientItem) { this.editingClientId = client.clientId; this.clientDraft = { clientName: client.clientName, address: client.address || '', city: client.city || '', state: client.state || '', zip: client.zip || '' }; this.clientFormOpen = true; this.error.set(''); }
  cancelClientForm() { this.clientFormOpen = false; this.editingClientId = undefined; }
  saveClient() {
    const clientName = this.clientDraft.clientName.trim(); if (!clientName) return;
    const fields: ClientFields = { clientName, address: this.clientDraft.address?.trim() || null, city: this.clientDraft.city?.trim() || null, state: this.clientDraft.state?.trim() || null, zip: this.clientDraft.zip?.trim() || null };
    const id = this.editingClientId;
    const request = id === undefined ? this.api.createClient(fields) : this.api.updateClient(id, fields);
    request.subscribe({ next: client => { this.clients.update(rows => [...rows.filter(row => row.clientId !== client.clientId), client].sort((a, b) => a.clientName.localeCompare(b.clientName))); this.cancelClientForm(); this.error.set(''); }, error: error => this.error.set(error.error?.message || 'Unable to save client. Please check the client ID and try again.') });
  }
  deleteClientRecord(client: ClientItem) {
    if (!window.confirm(`Delete client ${client.clientName} (ID #${client.clientId})?`)) return;
    this.api.deleteClient(client.clientId).subscribe({ next: () => { this.clients.update(rows => rows.filter(row => row.clientId !== client.clientId)); this.error.set(''); }, error: error => this.error.set(error.error?.message || 'Unable to delete client. Please try again.') });
  }
}
