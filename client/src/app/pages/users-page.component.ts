import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';

interface UserRecord { userId:number; userName:string; userTypeId:number; email:string; sirName:string; firstName:string; middleName:string; lastName:string; suffix:string; }
type UserDraft = Omit<UserRecord, 'userId'> & { password:string };
interface UserType { userTypeId:number; userTypeDesc:string; }

@Component({
  selector: 'app-users-page', standalone: true, imports: [CommonModule, FormsModule],
  styles: [`
    .user-form {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;padding:24px;margin-bottom:24px}
    .wide {grid-column:1/-1}.actions {display:flex;gap:12px;justify-content:flex-end}
    .table-wrap {overflow-x:auto;padding:20px}table {width:100%;border-collapse:collapse}th,td {text-align:left;padding:14px;border-bottom:1px solid #dde5ec}
    label {display:flex;flex-direction:column;gap:8px}input,select {padding:10px;border:1px solid #cbd5e1;border-radius:6px;min-width:0}
    button:disabled {opacity:.5;cursor:not-allowed}.notice {padding:12px;background:#eaf7ef;border-radius:8px}
    @media(max-width:650px){.user-form{grid-template-columns:1fr}}
  `],
  template: `
    <section>
      <div class="section-head"><div><p class="eyebrow">ADMINISTRATION</p><h1>Users</h1><p>Manage accounts and access to the care team portal.</p></div><button class="primary" (click)="create()" [disabled]="busy() || loading()">Add user</button></div>
      <p class="error" role="alert" *ngIf="error()">{{error()}}</p>
      <p class="notice" role="status" *ngIf="notice()">{{notice()}}</p>
      <form #form="ngForm" class="card user-form" *ngIf="draft as d" (ngSubmit)="save()">
        <h2 class="wide">{{editingId === null ? 'Add user' : 'Edit user'}}</h2>
        <label>Username<input name="userName" [(ngModel)]="d.userName" maxlength="30" required autocomplete="off"></label>
        <label>Email<input name="email" [(ngModel)]="d.email" maxlength="50" required type="email" email></label>
        <label>Title<input name="sirName" [(ngModel)]="d.sirName" maxlength="4" placeholder="Dr."></label>
        <label>First name<input name="firstName" [(ngModel)]="d.firstName" maxlength="30" required></label>
        <label>Middle name<input name="middleName" [(ngModel)]="d.middleName" maxlength="30"></label>
        <label>Last name<input name="lastName" [(ngModel)]="d.lastName" maxlength="30" required></label>
        <label>Suffix<input name="suffix" [(ngModel)]="d.suffix" maxlength="4"></label>
        <label>User type<select name="userTypeId" [(ngModel)]="d.userTypeId" required [disabled]="editingId === auth.currentUser()?.userId"><option *ngFor="let type of types()" [ngValue]="type.userTypeId">{{type.userTypeDesc}} ({{type.userTypeId}})</option></select></label>
        <label class="wide">{{editingId === null ? 'Password' : 'New password (leave blank to keep current password)'}}<input name="password" type="password" [(ngModel)]="d.password" [required]="editingId === null" minlength="12" maxlength="72" autocomplete="new-password"><small>Use at least 12 characters; maximum 72 UTF-8 bytes.</small></label>
        <div class="wide actions"><button type="button" class="text-btn" (click)="draft=null" [disabled]="busy()">Cancel</button><button class="primary" [disabled]="form.invalid || busy() || !types().length">{{busy() ? 'Saving…' : 'Save user'}}</button></div>
      </form>
      <p *ngIf="loading()" role="status">Loading users…</p>
      <div class="card table-wrap" *ngIf="!loading()">
        <table *ngIf="users().length; else empty"><thead><tr><th scope="col">Username</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">User type</th><th scope="col">Actions</th></tr></thead>
        <tbody><tr *ngFor="let user of users()"><td>{{user.userName}}</td><td>{{user.firstName}} {{user.lastName}}</td><td>{{user.email}}</td><td>{{typeName(user.userTypeId)}}</td><td><div class="actions"><button class="event-action" (click)="edit(user)" [disabled]="busy()">Edit</button><button class="event-action delete-event" (click)="remove(user)" [disabled]="busy() || user.userId === auth.currentUser()?.userId">Delete</button></div></td></tr></tbody></table>
        <ng-template #empty><p *ngIf="!error()">No users found.</p></ng-template>
      </div>
    </section>`
})
export class UsersPageComponent implements OnInit {
  users=signal<UserRecord[]>([]); types=signal<UserType[]>([]); error=signal(''); notice=signal(''); busy=signal(false); loading=signal(true);
  draft:UserDraft|null=null; editingId:number|null=null;
  constructor(private http:HttpClient, public auth:AuthService) {}
  ngOnInit() {
    this.http.get<UserType[]>('/api/user-types').subscribe({next: rows=>this.types.set(rows),error:e=>this.error.set(e.error?.message || 'Unable to load user types.')});
    this.refresh();
  }
  refresh() { this.loading.set(true); this.http.get<UserRecord[]>('/api/users').subscribe({next:rows=>{this.users.set(rows);this.loading.set(false);},error:e=>{this.error.set(e.error?.message || 'Unable to load users.');this.loading.set(false);}}); }
  typeName(id:number) { return this.types().find(t=>t.userTypeId===id)?.userTypeDesc || String(id); }
  create() { this.editingId=null;this.error.set('');this.notice.set('');this.draft={userName:'',email:'',sirName:'',firstName:'',middleName:'',lastName:'',suffix:'',userTypeId:this.types().find(t=>t.userTypeId!==1)?.userTypeId || 1,password:''}; }
  edit(user:UserRecord) { const {userId,...fields}=user;this.editingId=userId;this.draft={...fields,password:''};this.error.set('');this.notice.set(''); }
  save() {
    if(!this.draft || this.busy()) return;
    this.busy.set(true);this.error.set('');
    const request=this.editingId===null ? this.http.post<UserRecord>('/api/users',this.draft) : this.http.put<UserRecord>('/api/users/'+this.editingId,this.draft);
    request.subscribe({next:()=>{this.busy.set(false);this.draft=null;this.notice.set('User saved.');this.refresh();},error:e=>{this.busy.set(false);this.error.set(e.error?.message || 'Unable to save user.');}});
  }
  remove(user:UserRecord) {
    if(this.busy() || !window.confirm('Delete user '+user.userName+'? This cannot be undone.')) return;
    this.busy.set(true);this.error.set('');this.notice.set('');
    this.http.delete('/api/users/'+user.userId).subscribe({next:()=>{this.busy.set(false);if(this.editingId===user.userId)this.draft=null;this.notice.set('User deleted.');this.refresh();},error:e=>{this.busy.set(false);this.error.set(e.error?.message || 'Unable to delete user.');}});
  }
}
