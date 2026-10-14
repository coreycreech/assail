import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-form-modal', standalone: true,
  template: `<dialog #dialog [attr.aria-label]="label" (cancel)="cancel($event)">
    <div class="modal-toolbar"><strong>{{label}}</strong><button type="button" aria-label="Close dialog" [disabled]="busy" (click)="dismiss.emit()">&#215;</button></div>
    <ng-content></ng-content>
  </dialog>`,
  styles: [`
    dialog{width:min(900px,calc(100vw - 32px));max-height:90dvh;box-sizing:border-box;border:0;border-radius:16px;padding:24px;background:#fff;color:#0b1e3b;box-shadow:0 24px 80px #0004;overflow:auto}
    dialog::backdrop{background:rgba(11,30,59,.55)}
    .modal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
    button{border:0;border-radius:6px;background:#eef6fa;color:#0b1e3b;width:40px;height:40px;font-size:26px;cursor:pointer}
    button:focus-visible{outline:2px solid #0876b9;outline-offset:2px}
    @media(max-width:600px){dialog{padding:16px;width:calc(100vw - 16px);max-height:94dvh}}
  `]
})
export class FormModalComponent implements AfterViewInit, OnDestroy {
  @Input() label = 'Add record';
  @Input() busy = false;
  @Output() dismiss = new EventEmitter<void>();
  @ViewChild('dialog', {static:true}) dialog!:ElementRef<HTMLDialogElement>;
  private previousFocus:HTMLElement|null=null;
  private previousOverflow='';
  ngAfterViewInit() {
    this.previousFocus=document.activeElement as HTMLElement;
    this.previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    this.dialog.nativeElement.showModal();
    this.dialog.nativeElement.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus();
  }
  cancel(event:Event) { event.preventDefault();if(!this.busy)this.dismiss.emit(); }
  ngOnDestroy() {
    this.dialog.nativeElement.close();
    document.body.style.overflow=this.previousOverflow;
    if(this.previousFocus?.isConnected)this.previousFocus.focus();
  }
}
