import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CalendarEvent, NewCalendarEvent } from '../api.service';

type AppointmentBoundary = 'start' | 'end';
interface CalendarDay { key: string; number: number; inMonth: boolean; isToday: boolean; events: CalendarEvent[]; }

@Component({
  selector: 'app-calendar-page', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="calendar-page">
      <p class="error" *ngIf="error()">{{error()}}</p>
      <div class="calendar-welcome">
        <div class="calendar-welcome-copy"><p class="eyebrow">YOUR CARE, IN ONE PLACE</p><h1>Care calendar</h1><p>Plan appointments, keep track of visits, and see what’s coming up.</p><button class="primary" type="button" (click)="appointmentOpen ? cancelAppointment() : openNewAppointment()">{{appointmentOpen ? 'Close form' : 'Schedule an appointment'}} <span aria-hidden="true">&#8594;</span></button></div>
        <img class="calendar-doctor" src="/assail-calendar-doctor.jpg" alt="Smiling healthcare professional wearing a stethoscope">
      </div>

      <div class="calendar-toolbar"><div><p class="eyebrow">YOUR SCHEDULE</p><h2>Appointments</h2></div><div class="calendar-toolbar-actions"><button type="button" class="calendar-refresh" (click)="refresh()" aria-label="Refresh appointments">&#8635; Refresh</button><button class="primary" type="button" (click)="appointmentOpen ? cancelAppointment() : openNewAppointment()">+ Add appointment</button></div></div>

      <div class="calendar-layout">
        <div class="calendar-panel">
          <div class="month-toolbar"><button type="button" class="month-nav" (click)="moveMonth(-1)" aria-label="Previous month">&#8249;</button><h3>{{monthTitle()}}</h3><button type="button" class="month-nav" (click)="moveMonth(1)" aria-label="Next month">&#8250;</button><button type="button" class="today-button" (click)="goToToday()">Today</button></div>
          <div class="weekday-row"><span *ngFor="let weekday of weekdays">{{weekday}}</span></div>
          <div class="month-grid"><button *ngFor="let day of calendarDays()" type="button" class="calendar-day" [class.outside-month]="!day.inMonth" [class.today]="day.isToday" [class.selected]="selectedDate()===day.key" (click)="selectDate(day.key)" [attr.aria-label]="day.key + ', ' + day.events.length + ' appointments'">
            <span class="day-number">{{day.number}}</span><span *ngFor="let event of day.events.slice(0,2)" class="day-event">{{event.eventTitle}}</span><span *ngIf="day.events.length>2" class="more-events">+{{day.events.length-2}} more</span>
          </button></div>
          <div class="calendar-legend"><span><i class="legend-dot"></i>Appointment</span><span><i class="legend-dot today-dot"></i>Today</span></div>
        </div>

        <aside class="selected-day-panel">
          <p class="eyebrow">SELECTED DAY</p><h3>{{selectedDateObject() | date:'EEEE, MMMM d'}}</h3><p class="selected-day-count">{{selectedDayEvents().length}} {{selectedDayEvents().length === 1 ? 'appointment' : 'appointments'}}</p>
          <div class="selected-events" *ngIf="selectedDayEvents().length; else noDayEvents"><article class="selected-event" *ngFor="let event of selectedDayEvents()"><div class="event-time"><span>{{event.eventStart | date:'h:mm a'}}</span><i></i><span>{{event.eventEnd | date:'h:mm a'}}</span></div><div class="selected-event-info"><h4>{{event.eventTitle}}</h4><p>{{event.eventSubject}}</p><small>{{event.eventDetail}}</small></div><div class="selected-event-actions"><button type="button" class="event-action" (click)="editEvent(event)">Edit</button><button type="button" class="event-action delete-event" (click)="deleteEvent(event)">Delete</button></div></article></div>
          <ng-template #noDayEvents><div class="empty-day"><span class="empty-day-icon">&#9711;</span><p>No appointments this day.</p><button type="button" class="text-btn" (click)="openNewAppointment()">Schedule one</button></div></ng-template>
        </aside>
      </div>

      <form class="card appointment-form" *ngIf="appointmentOpen" (ngSubmit)="saveAppointment()">
        <div class="form-heading wide"><span class="form-icon">+</span><div><h3>{{editingEventId === undefined ? 'Schedule an appointment' : 'Edit appointment'}}</h3><p>{{editingEventId === undefined ? 'Add visit details and choose the date and time.' : 'Update the visit details, dates, or times.'}}</p></div></div>
        <label class="wide">Appointment title<input name="eventTitle" [(ngModel)]="newAppointment.eventTitle" required maxlength="50" placeholder="e.g. Follow-up visit"></label>
        <label>Subject<input name="eventSubject" [(ngModel)]="newAppointment.eventSubject" required maxlength="100" placeholder="e.g. Primary care"></label>
        <label>Repeats<select name="recurrenceRule" [(ngModel)]="newAppointment.recurrenceRule"><option value="">Does not repeat</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label>
        <fieldset class="date-card"><legend>Starts</legend><label>Date<input name="startDate" [ngModel]="newAppointment.eventStart.slice(0, 10)" (ngModelChange)="setAppointmentDate('start', $event)" required type="date" aria-label="Start date"></label><label>Time<input name="startTime" [ngModel]="newAppointment.eventStart.slice(11, 16)" (ngModelChange)="setAppointmentTime('start', $event)" required type="time" aria-label="Start time"></label></fieldset>
        <fieldset class="date-card"><legend>Ends</legend><label>Date<input name="endDate" [ngModel]="newAppointment.eventEnd.slice(0, 10)" (ngModelChange)="setAppointmentDate('end', $event)" required type="date" aria-label="End date"></label><label>Time<input name="endTime" [ngModel]="newAppointment.eventEnd.slice(11, 16)" (ngModelChange)="setAppointmentTime('end', $event)" required type="time" aria-label="End time"></label></fieldset>
        <label class="wide">Notes<textarea name="eventDetail" [(ngModel)]="newAppointment.eventDetail" required maxlength="300" placeholder="Add details to help everyone prepare"></textarea></label>
        <label class="check wide"><input name="isAllDay" [(ngModel)]="newAppointment.isAllDay" type="checkbox"> This is an all-day appointment</label>
        <div class="wide form-actions"><span>Complete the title, subject, dates, times, and notes. Repeats is optional.</span><div><button type="button" class="text-btn cancel" (click)="cancelAppointment()">Cancel</button><button class="primary" type="submit">{{editingEventId === undefined ? 'Save appointment' : 'Save changes'}}</button></div></div>
      </form>
    </section>`
})
export class CalendarPageComponent implements OnInit {
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  events = signal<CalendarEvent[]>([]);
  error = signal('');
  appointmentOpen = false;
  editingEventId?: number;
  displayMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  selectedDate = signal(this.dateKey(new Date()));
  monthTitle = computed(() => this.displayMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  calendarDays = computed(() => {
    const month = this.displayMonth();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const todayKey = this.dateKey(new Date());
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = this.dateKey(date);
      return { key, number: date.getDate(), inMonth: date.getMonth() === month.getMonth(), isToday: key === todayKey, events: this.eventsFor(key) };
    });
  });
  selectedDayEvents = computed(() => this.eventsFor(this.selectedDate()));
  newAppointment: NewCalendarEvent = this.emptyAppointment();
  constructor(private api: ApiService) {}
  ngOnInit() { this.refresh(); }

  private dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private eventDateKey(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value.slice(0, 10) : this.dateKey(date);
  }
  private eventsFor(key: string) { return this.events().filter(event => this.eventDateKey(event.eventStart) === key).sort((a, b) => a.eventStart.localeCompare(b.eventStart)); }
  selectedDateObject() { return new Date(`${this.selectedDate()}T00:00:00`); }
  selectDate(key: string) {
    this.selectedDate.set(key);
    const date = new Date(`${key}T00:00:00`);
    if (date.getMonth() !== this.displayMonth().getMonth() || date.getFullYear() !== this.displayMonth().getFullYear()) {
      this.displayMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }
  moveMonth(amount: number) { const month = this.displayMonth(); this.displayMonth.set(new Date(month.getFullYear(), month.getMonth() + amount, 1)); }
  goToToday() { const today = new Date(); this.displayMonth.set(new Date(today.getFullYear(), today.getMonth(), 1)); this.selectedDate.set(this.dateKey(today)); }
  private emptyAppointment(): NewCalendarEvent {
    return { eventTitle: '', eventStart: '', eventEnd: '', eventSubject: 'Appointment', eventDetail: '', isBlock: false, isReadOnly: false, recurrenceRule: '', isAllDay: false };
  }
  refresh() { this.api.events().subscribe({ next: rows => { this.events.set(rows); this.error.set(''); }, error: () => this.error.set('Unable to load appointments.') }); }
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
    if (boundary === 'start') this.newAppointment.eventStart = value; else this.newAppointment.eventEnd = value;
  }
  openNewAppointment() {
    this.editingEventId = undefined;
    const start = new Date(`${this.selectedDate()}T09:00:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    this.newAppointment = { ...this.emptyAppointment(), eventStart: this.toLocalDateTime(start), eventEnd: this.toLocalDateTime(end) };
    this.appointmentOpen = true; this.error.set('');
  }
  editEvent(event: CalendarEvent) {
    this.editingEventId = event.eventId;
    this.selectedDate.set(this.eventDateKey(event.eventStart));
    this.newAppointment = { ...event, eventStart: this.toLocalDateTime(new Date(event.eventStart)), eventEnd: this.toLocalDateTime(new Date(event.eventEnd)) };
    this.appointmentOpen = true;
  }
  private toLocalDateTime(date: Date) {
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  cancelAppointment() { this.appointmentOpen = false; this.editingEventId = undefined; }
  deleteEvent(event: CalendarEvent) {
    if (!window.confirm(`Delete “${event.eventTitle}”? This cannot be undone.`)) return;
    this.api.deleteEvent(event.eventId).subscribe({ next: () => this.refresh(), error: () => this.error.set('Unable to delete appointment. Please try again.') });
  }
  saveAppointment() {
    const save = this.editingEventId === undefined ? this.api.createEvent(this.newAppointment) : this.api.updateEvent(this.editingEventId, this.newAppointment);
    save.subscribe({
      next: () => { this.cancelAppointment(); this.newAppointment = this.emptyAppointment(); this.error.set(''); this.refresh(); },
      error: error => this.error.set(error.error?.message || 'Unable to save appointment. Please check the details and database connection.')
    });
  }
}
