import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface UserType { userTypeId:number; userTypeDesc:string; }
@Component({
  selector:'app-user-types-page', standalone:true, imports:[CommonModule,FormsModule],
  styles:[`.card{padding:24px;margin-bottom:20px}form{display:flex;gap:16px;align-items:end;flex-wrap:wrap}label{display:grid;gap:8px}input{padding:10px;border:1px solid #cbd5e1;border-radius:6px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:14px;border-bottom:1px solid #ddd}.table-wrap{overflow:auto}button{margin-right:8px}`],
  template:`<section><div class="section-head"><div><p class="eyebrow">ADMINISTRATION</p><h1>User types</h1><p>Assign these types using the Users page.</p></div><button class="primary" (click)="start()" [disabled]="busy()">Add user type</button></div>
  <p>Admin (1): all features. Staff (2): care calendar, billing, services, documents, clients, and resources. Additional types have no portal access until access rules are defined.</p>
  <p class="error" role="alert" *ngIf="error()">{{error()}}</p><p role="status" *ngIf="message()">{{message()}}</p>
  <form class="card" *ngIf="open" #form="ngForm" (ngSubmit)="save()"><label>Description (required)<input name="description" [(ngModel)]="description" required maxlength="50"></label><button class="primary" [disabled]="form.invalid || busy()">{{busy() ? 'Saving…' : 'Save'}}</button><button type="button" (click)="open=false" [disabled]="busy()">Cancel</button></form>
  <p role="status" *ngIf="loading()">Loading user types…</p>
  <div class="card table-wrap" *ngIf="!loading()"><table><thead><tr><th>ID</th><th>Description</th><th>Actions</th></tr></thead><tbody><tr *ngFor="let row of rows()"><td>{{row.userTypeId}}</td><td>{{row.userTypeDesc}}</td><td><span *ngIf="row.userTypeId===1 || row.userTypeId===2; else actions">System role</span><ng-template #actions><button (click)="edit(row)" [disabled]="busy()">Edit</button><button (click)="remove(row)" [disabled]="busy()">Delete</button></ng-template></td></tr></tbody></table><p *ngIf="!rows().length && !error()">No user types found.</p></div></section>`
})
export class UserTypesPageComponent implements OnInit {
  rows=signal<UserType[]>([]);error=signal('');message=signal('');busy=signal(false);loading=signal(false);
  open=false;id:number|null=null;description='';
  constructor(private http:HttpClient) {}
  ngOnInit(){this.refresh();}
  refresh(){this.loading.set(true);this.http.get<UserType[]>('/api/user-types').subscribe({next:rows=>{this.rows.set(rows);this.loading.set(false);},error:e=>{this.error.set(e.error?.message || 'Unable to load user types.');this.loading.set(false);}});}
  start(){this.id=null;this.description='';this.open=true;this.error.set('');this.message.set('');}
  edit(row:UserType){this.start();this.id=row.userTypeId;this.description=row.userTypeDesc;}
  save(){if(this.busy())return;this.busy.set(true);this.error.set('');const body={userTypeDesc:this.description.trim()};const request=this.id===null?this.http.post('/api/user-types',body):this.http.put('/api/user-types/'+this.id,body);request.subscribe({next:()=>{this.busy.set(false);this.open=false;this.message.set('User type saved.');this.refresh();},error:e=>{this.busy.set(false);this.error.set(e.error?.message || 'Unable to save user type.');}});}
  remove(row:UserType){if(this.busy() || !window.confirm('Delete '+row.userTypeDesc+'?'))return;this.busy.set(true);this.error.set('');this.http.delete('/api/user-types/'+row.userTypeId).subscribe({next:()=>{this.busy.set(false);if(this.id===row.userTypeId)this.open=false;this.message.set('User type deleted.');this.refresh();},error:e=>{this.busy.set(false);this.error.set(e.error?.message || 'Unable to delete user type.');}});}
}
