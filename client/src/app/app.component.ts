import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CalendarEvent, DocumentItem, NewCalendarEvent } from './api.service';

type View = 'dashboard' | 'calendar' | 'documents' | 'content';
type AppointmentBoundary = 'start' | 'end';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  view = signal<View>('dashboard');
  events = signal<CalendarEvent[]>([]);
  documents = signal<DocumentItem[]>([]);
  online = signal(false);
  error = signal('');
  appointmentOpen = false;
  editingEventId?: number;
  selectedFile?: File;
  clientId = 1;
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
    this.selectedFile = (event.target as HTMLInputElement).files?.[0];
  }

  upload() {
    if (!this.selectedFile) return;
    this.api.uploadDocument(this.selectedFile, this.clientId).subscribe({
      next: () => {
        this.selectedFile = undefined;
        this.api.documents().subscribe(documents => this.documents.set(documents));
      },
      error: () => this.error.set('Unable to upload document.')
    });
  }

  removeDocument(id: number) {
    this.api.deleteDocument(id).subscribe(() => this.documents.update(items => items.filter(item => item.docId !== id)));
  }
}
