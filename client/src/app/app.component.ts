import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CalendarEvent, ClientFields, ClientItem, DocumentItem, NewCalendarEvent } from './api.service';

type View = 'dashboard' | 'calendar' | 'documents' | 'clients' | 'content';
type AppointmentBoundary = 'start' | 'end';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly usStates = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
  ];

  view = signal<View>('dashboard');
  events = signal<CalendarEvent[]>([]);
  documents = signal<DocumentItem[]>([]);
  clients = signal<ClientItem[]>([]);
  online = signal(false);
  error = signal('');
  appointmentOpen = false;
  editingEventId?: number;
  selectedFile?: File;
  private documentFileInput?: HTMLInputElement;
  clientId: number | null = null;
  clientCreationOpen = false;
  newClientName = '';
  clientFormOpen = false;
  editingClientId?: number;
  clientDraft: ClientFields = { clientName: '', address: '', city: '', state: '', zip: '' };
  today = new Date();
  todayLabel = this.today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  upcoming = computed(() => this.events().slice(0, 4));
  newAppointment: NewCalendarEvent = {
    eventTitle: '',
    eventStart: '',
    eventEnd: '',
    eventSubject: 'Appointment',
    eventDetail: '',
    isBlock: false,
    isReadOnly: false,
    recurrenceRule: '',
    isAllDay: false
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.api.health().subscribe({
      next: () => this.online.set(true),
      error: () => {
        this.online.set(false);
        this.error.set('API is unavailable. Start the Node server to connect to live care data.');
      }
    });
    this.api.events().subscribe({ next: events => this.events.set(events), error: () => {} });
    this.api.documents().subscribe({ next: documents => this.documents.set(documents), error: () => {} });
    this.api.clients().subscribe({
      next: clients => {
        this.clients.set(clients);
        if (!clients.some(client => client.clientId === this.clientId)) this.clientId = clients[0]?.clientId ?? null;
      },
      error: () => {}
    });
  }

  setAppointmentDate(boundary: AppointmentBoundary, date: string) {
    const current = boundary === 'start' ? this.newAppointment.eventStart : this.newAppointment.eventEnd;
    this.setAppointmentDateTime(boundary, date, current.slice(11, 16));
  }

  setAppointmentTime(boundary: AppointmentBoundary, time: string) {
    const current = boundary === 'start' ? this.newAppointment.eventStart : this.newAppointment.eventEnd;
    this.setAppointmentDateTime(boundary, current.slice(0, 10), time);
  }

  private setAppointmentDateTime(boundary: AppointmentBoundary, date: string, time: string) {
    const value = date || time ? `${date}T${time}` : '';
    if (boundary === 'start') this.newAppointment.eventStart = value;
    else this.newAppointment.eventEnd = value;
  }

  openNewAppointment() {
    this.editingEventId = undefined;
    this.newAppointment = {
      eventTitle: '', eventStart: '', eventEnd: '', eventSubject: 'Appointment', eventDetail: '',
      isBlock: false, isReadOnly: false, recurrenceRule: '', isAllDay: false
    };
    this.appointmentOpen = true;
  }

  editEvent(event: CalendarEvent) {
    this.editingEventId = event.eventId;
    this.newAppointment = {
      eventTitle: event.eventTitle,
      eventStart: this.toLocalDateTime(event.eventStart),
      eventEnd: this.toLocalDateTime(event.eventEnd),
      eventSubject: event.eventSubject,
      eventDetail: event.eventDetail,
      isBlock: event.isBlock,
      isReadOnly: event.isReadOnly,
      recurrenceRule: event.recurrenceRule,
      isAllDay: event.isAllDay
    };
    this.appointmentOpen = true;
  }

  private toLocalDateTime(value: string) {
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  cancelAppointment() {
    this.appointmentOpen = false;
    this.editingEventId = undefined;
  }

  deleteEvent(event: CalendarEvent) {
    if (!window.confirm(`Delete “${event.eventTitle}”? This cannot be undone.`)) return;
    this.api.deleteEvent(event.eventId).subscribe({
      next: () => this.api.events().subscribe(events => this.events.set(events)),
      error: () => this.error.set('Unable to delete appointment. Please try again.')
    });
  }

  saveAppointment() {
    const save = this.editingEventId === undefined
      ? this.api.createEvent(this.newAppointment)
      : this.api.updateEvent(this.editingEventId, this.newAppointment);
    save.subscribe({
      next: () => {
        this.cancelAppointment();
        this.newAppointment = {
          eventTitle: '', eventStart: '', eventEnd: '', eventSubject: 'Appointment', eventDetail: '',
          isBlock: false, isReadOnly: false, recurrenceRule: '', isAllDay: false
        };
        this.api.events().subscribe(events => this.events.set(events));
      },
      error: () => this.error.set('Unable to save appointment. Please check the details and database connection.')
    });
  }

  chooseFile(event: Event) {
    this.documentFileInput = event.target as HTMLInputElement;
    this.selectedFile = this.documentFileInput.files?.[0];
  }

  canPreviewDocument(document: DocumentItem) {
    return /\.(pdf|png|jpe?g|gif|webp|txt)$/i.test(document.filePath || document.docName);
  }

  addClient() {
    const clientName = this.newClientName.trim();
    if (!clientName) return;
    this.api.createClient({ clientName, address: '', city: '', state: '', zip: '' }).subscribe({
      next: client => {
        this.clients.update(clients => [...clients, client].sort((a, b) => a.clientName.localeCompare(b.clientName)));
        this.clientId = client.clientId;
        this.newClientName = '';
        this.clientCreationOpen = false;
        this.error.set('');
      },
      error: () => this.error.set('Unable to add client. Please try again.')
    });
  }

  startCreateClient() {
    this.editingClientId = undefined;
    this.clientDraft = { clientName: '', address: '', city: '', state: '', zip: '' };
    this.clientFormOpen = true;
    this.error.set('');
  }

  editClient(client: ClientItem) {
    this.editingClientId = client.clientId;
    this.clientDraft = {
      clientName: client.clientName,
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip: client.zip || ''
    };
    this.clientFormOpen = true;
    this.error.set('');
  }

  cancelClientForm() {
    this.clientFormOpen = false;
    this.editingClientId = undefined;
  }

  saveClient() {
    const clientName = this.clientDraft.clientName.trim();
    if (!clientName) return;
    const editingClientId = this.editingClientId;
    const fields: ClientFields = {
      clientName,
      address: this.clientDraft.address?.trim() || null,
      city: this.clientDraft.city?.trim() || null,
      state: this.clientDraft.state?.trim() || null,
      zip: this.clientDraft.zip?.trim() || null
    };
    const save = editingClientId === undefined
      ? this.api.createClient(fields)
      : this.api.updateClient(editingClientId, fields);
    save.subscribe({
      next: client => {
        this.clients.update(clients => [...clients.filter(item => item.clientId !== client.clientId), client]
          .sort((a, b) => a.clientName.localeCompare(b.clientName)));
        this.clientId = client.clientId;
        this.cancelClientForm();
        this.error.set('');
      },
      error: error => this.error.set(error.error?.message || 'Unable to save client. Please check the client ID and try again.')
    });
  }

  deleteClientRecord(client: ClientItem) {
    if (!window.confirm(`Delete client ${client.clientName} (ID #${client.clientId})?`)) return;
    this.api.deleteClient(client.clientId).subscribe({
      next: () => {
        this.clients.update(clients => clients.filter(item => item.clientId !== client.clientId));
        if (this.clientId === client.clientId) this.clientId = this.clients()[0]?.clientId ?? null;
        this.error.set('');
      },
      error: error => this.error.set(error.error?.message || 'Unable to delete client. Please try again.')
    });
  }

  upload() {
    const file = this.selectedFile;
    const clientId = this.clientId;
    if (!file || clientId === null) return;
    this.api.uploadDocument(file, clientId).subscribe({
      next: () => {
        this.selectedFile = undefined;
        if (this.documentFileInput) this.documentFileInput.value = '';
        this.error.set('');
        this.api.documents().subscribe(documents => this.documents.set(documents));
      },
      error: () => this.error.set('Unable to upload document.')
    });
  }

  removeDocument(id: number) {
    this.api.deleteDocument(id).subscribe(() => this.documents.update(items => items.filter(item => item.docId !== id)));
  }
}
