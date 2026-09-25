import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ClientFields, ClientItem, DocumentItem } from '../api.service';

@Component({
  selector: 'app-documents-page', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section>
      <p class="error" *ngIf="error()">{{error()}}</p>
      <div class="section-head"><div><p class="eyebrow">SHARED RECORDS</p><h2>Documents</h2></div></div>
      <div class="card upload-panel">
        <div class="upload-intro"><span class="upload-icon">&#8682;</span><div><p class="eyebrow">ADD TO CLIENT RECORD</p><h3>Upload a document</h3><p>Follow the two steps below. Your file is saved to the database and appears in the document list.</p></div></div>
        <div class="upload-steps">
          <div class="upload-step"><span class="step-number">1</span><div class="step-body"><b>Choose a document</b><p>PDF, Word, text, or image file up to 10 MB</p><label class="file-picker">Choose file<input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.txt" (change)="chooseFile($event)"></label></div></div>
          <div class="upload-step"><span class="step-number">2</span><div class="step-body"><label class="client-label">Client record<select class="client-select" name="clientId" [(ngModel)]="clientId"><option [ngValue]="null" disabled>Select a client</option><option *ngFor="let client of clients()" [ngValue]="client.clientId">{{client.clientName}} (ID #{{client.clientId}})</option></select></label><p class="step-hint">Choose which client record should hold this document.</p><button type="button" class="add-client-toggle" (click)="clientCreationOpen=!clientCreationOpen">{{clientCreationOpen ? 'Cancel adding client' : '+ Add a client'}}</button><div class="client-create" *ngIf="clientCreationOpen"><label class="client-label">Client name<input name="newClientName" [(ngModel)]="newClientName" maxlength="45" required placeholder="e.g. Jordan Lee"></label><p class="step-hint">The client ID will be assigned automatically.</p><button type="button" class="primary save-client" [disabled]="!newClientName.trim()" (click)="addClient()">Save client</button></div><p class="step-hint" *ngIf="!clients().length">Add a client before uploading a document.</p></div></div>
        </div>
        <div class="upload-footer"><div class="selected-file" [class.has-file]="!!selectedFile" aria-live="polite"><span class="file-status-icon">{{selectedFile ? 'Ready' : 'Waiting'}}</span><span>{{selectedFile?.name || 'No file selected yet'}}</span></div><button type="button" class="primary upload-button" [disabled]="!selectedFile || !clientId" (click)="upload()">Upload document</button></div>
        <p class="upload-note">Choose a file and select a client to enable the upload button. PDFs, images, and text files can be previewed; other files can be downloaded.</p>
      </div>
      <div class="card table-card"><div class="document" *ngFor="let d of documents()"><span class="doc-icon">&#128196;</span><div class="document-info"><h3>{{d.docName}}</h3><p>Client #{{d.clientId}}</p></div><a *ngIf="canPreviewDocument(d)" [href]="api.url+'/documents/'+d.docId+'/view'" target="_blank" rel="noopener noreferrer">View</a><span class="preview-unavailable" *ngIf="!canPreviewDocument(d)">Preview unavailable</span><a [href]="api.url+'/documents/'+d.docId+'/download'">Download</a><button type="button" class="delete" (click)="removeDocument(d.docId)">Remove</button></div><div class="calendar-empty" *ngIf="!documents().length">No documents have been uploaded yet. Choose a file above to add one.</div></div>
    </section>`
})
export class DocumentsPageComponent implements OnInit {
  documents = signal<DocumentItem[]>([]);
  clients = signal<ClientItem[]>([]);
  error = signal('');
  clientId: number | null = null;
  clientCreationOpen = false;
  newClientName = '';
  selectedFile?: File;
  private documentFileInput?: HTMLInputElement;
  constructor(public api: ApiService) {}
  ngOnInit() {
    this.refreshDocuments();
    this.api.clients().subscribe({ next: clients => { this.clients.set(clients); if (!clients.some(client => client.clientId === this.clientId)) this.clientId = clients[0]?.clientId ?? null; }, error: () => this.error.set('Unable to load clients.') });
  }
  private refreshDocuments() { this.api.documents().subscribe({ next: docs => this.documents.set(docs), error: () => this.error.set('Unable to load documents.') }); }
  chooseFile(event: Event) { this.documentFileInput = event.target as HTMLInputElement; this.selectedFile = this.documentFileInput.files?.[0]; }
  canPreviewDocument(document: DocumentItem) { return /\.(pdf|png|jpe?g|gif|webp|txt)$/i.test(document.filePath || document.docName); }
  addClient() {
    const clientName = this.newClientName.trim(); if (!clientName) return;
    const fields: ClientFields = { clientName, address: '', city: '', state: '', zip: '' };
    this.api.createClient(fields).subscribe({
      next: client => { this.clients.update(items => [...items, client].sort((a, b) => a.clientName.localeCompare(b.clientName))); this.clientId = client.clientId; this.newClientName = ''; this.clientCreationOpen = false; this.error.set(''); },
      error: () => this.error.set('Unable to add client. Please try again.')
    });
  }
  upload() {
    const file = this.selectedFile; const clientId = this.clientId; if (!file || clientId === null) return;
    this.api.uploadDocument(file, clientId).subscribe({
      next: () => { this.selectedFile = undefined; if (this.documentFileInput) this.documentFileInput.value = ''; this.error.set(''); this.refreshDocuments(); },
      error: () => this.error.set('Unable to upload document.')
    });
  }
  removeDocument(id: number) {
    if (!window.confirm('Remove this document? This cannot be undone.')) return;
    this.api.deleteDocument(id).subscribe({ next: () => this.documents.update(items => items.filter(item => item.docId !== id)), error: () => this.error.set('Unable to remove document.') });
  }
}
