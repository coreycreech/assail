import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-help-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    details { border-top:1px solid #dce5ed; padding:16px 0; }
    summary { cursor:pointer; font-size:1.15rem; font-weight:700; padding:8px 0; }
    summary:focus-visible { outline:2px solid #007bb5; outline-offset:4px; }
    .help-card { padding:24px; margin-bottom:24px; }
    .table-wrap { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; }
    caption { text-align:left; margin-bottom:16px; }
    th, td { text-align:left; padding:14px; border-bottom:1px solid #dce5ed; }
    thead { background:#eef6fa; }
    h2 { margin-top:0; }
    p, li { line-height:1.7; }
  `],
  template: `
    <section>
      <div class="section-head"><div><p class="eyebrow">CARE TEAM SUPPORT</p><h1>Help</h1><p>Learn how to use the care team portal and manage your website.</p></div></div>
      <section *ngIf="isAdmin" class="card help-card" aria-labelledby="admin-guide-heading">
        <h2 id="admin-guide-heading">Administrator guide</h2>
        <p>Open a topic below for instructions, then use its link to go to that component. For billing, add your clients and services before recording visits.</p>
        <p>Save completes a change; Cancel closes the form without saving. Read confirmation messages before deleting a record. Changes to public content appear when visitors reload the page.</p>
        <details *ngFor="let topic of topics">
          <summary>{{topic.title}}</summary>
          <p>{{topic.description}}</p>
          <ol><li *ngFor="let step of topic.steps">{{step}}</li></ol>
          <p *ngIf="topic.note"><strong>Remember:</strong> {{topic.note}}</p>
          <a [routerLink]="topic.route">Open {{topic.title}}</a>
        </details>
      </section>
      <section class="card help-card" aria-labelledby="permissions-heading">
        <h2 id="permissions-heading">Who can access each feature?</h2>
        <div class="table-wrap">
          <table>
            <caption>Admin (user type 1) has full access. Staff (user type 2) can manage care records.</caption>
            <thead><tr><th scope="col">Feature</th><th scope="col">Admin</th><th scope="col">Staff</th></tr></thead>
            <tbody>
              <tr><th scope="row">Care calendar</th><td>Yes</td><td>Yes</td></tr>
              <tr><th scope="row">Billing</th><td>Yes</td><td>Yes</td></tr>
              <tr><th scope="row">Services</th><td>Yes</td><td>Yes</td></tr>
              <tr><th scope="row">Documents</th><td>Yes</td><td>Yes</td></tr>
              <tr><th scope="row">Clients</th><td>Yes</td><td>Yes</td></tr>
              <tr><th scope="row">Resources</th><td>View, add, edit, delete</td><td>View only</td></tr>
              <tr><th scope="row">Page content editing (PageInfo and PageSection)</th><td>Yes</td><td>No</td></tr>
              <tr><th scope="row">Users</th><td>Yes</td><td>No</td></tr>
              <tr><th scope="row">User types</th><td>Yes</td><td>No</td></tr>
              <tr><th scope="row">Help</th><td>Yes</td><td>Yes</td></tr>
            </tbody>
          </table>
        </div>
        <p>Home and About Us are public pages. Everyone can read them; only administrators can edit their content.</p>
      </section>
      <section class="card help-card" aria-labelledby="access-heading">
        <h2 id="access-heading">How permissions work</h2>
        <p>Your administrator assigns your user type on the Users page. The portal checks access when opening protected pages, and the server checks your current database role when handling protected requests. Entering a restricted URL directly does not grant access.</p>
        <p>If your role changes, sign out and sign in again to refresh the navigation. Server restrictions take effect immediately. Additional user types have no access to private care or administration features until access rules are defined.</p>
        <p>If you cannot access a feature you need, contact your administrator.</p>
      </section>
    </section>
  `
})
export class HelpPageComponent {
  constructor(private auth: AuthService) {}
  get isAdmin() { return Number(this.auth.currentUser()?.userTypeId) === 1; }
  readonly topics = [
  {
    "title": "Overview / Home",
    "route": "/",
    "description": "The Home page introduces the organization and displays editable service panels and health care resources.",
    "steps": [
      "Use Page content to update the Home headline, supporting copy, and Our Services introduction.",
      "Manage the service panels under Page content ? Page sections ? Home.",
      "Manage Health Care Resources in Resources, then open Home to review the saved result."
    ],
    "note": "The Services component controls billing services and rates. It does not control the service panels on Home."
  },
  {
    "title": "Care calendar",
    "route": "/calendar",
    "description": "Schedule and manage appointments.",
    "steps": [
      "Select Add appointment or Schedule an appointment to open the popup.",
      "Enter a title, subject, start and end date/time, and notes. Choose a repeat option or all-day setting when needed, then save.",
      "Use the month arrows or Today, and select a day to see its appointments.",
      "Use an appointment?s Edit or Delete action to update or remove it. Use Refresh to reload appointments."
    ],
    "note": "Check the repeat setting before editing or deleting a recurring appointment."
  },
  {
    "title": "Clients",
    "route": "/clients",
    "description": "Create the client records used by billing and documents.",
    "steps": [
      "Select Add client to open the popup. Enter the required client name and any address details, then save.",
      "Use Edit to change a client?s information. The assigned client ID cannot be changed.",
      "Use Delete only when the client is no longer needed. If linked records prevent deletion, review the message before proceeding."
    ],
    "note": "Create the client first so it can be selected when recording a visit or uploading a document."
  },
  {
    "title": "Services",
    "route": "/services",
    "description": "Maintain the service choices and rates used in billing.",
    "steps": [
      "Select Add service to open the popup.",
      "Enter the required service name and billing rate. Add an optional description, then save.",
      "Use Edit to update a service. Select a service on a billing visit to use its saved rate.",
      "Use Delete to remove an unused service. Services referenced by billing records cannot be deleted."
    ],
    "note": "Home page service panels are managed separately in Page content."
  },
  {
    "title": "Billing",
    "route": "/billing",
    "description": "Record visits and download a bill for one client at a time.",
    "steps": [
      "Select the client in Client worksheet. Ensure at least one service exists before selecting Add visit.",
      "In the popup, choose a visit date and service, enter units, and add times, billing code, and notes as needed. Review the rate and amount, then save.",
      "Select a saved row or Edit to change a visit; Save commits the edit and Cancel discards it. Delete removes a visit after confirmation.",
      "Set Month, Year, and Service / Visit to narrow the worksheet. The visit count, units, and recorded amount use the same filters. Clear filters restores all visits for that client.",
      "Select Download bill (HTML) to download the saved visits matching the filters. Open the file in a browser and use Print to print it or save it as a PDF."
    ],
    "note": "The recorded amount reflects charges, not payments or an outstanding balance. A new visit outside the current filters will not appear until you adjust them."
  },
  {
    "title": "Documents",
    "route": "/documents",
    "description": "Upload and retrieve documents grouped under each client?s name.",
    "steps": [
      "Choose a file and select the client record that should hold it. Use Add a client first if necessary.",
      "Select Upload document. Supported uploads include PDF, Word, text, and images up to 10 MB.",
      "Find the client?s group and select View for a supported preview, or Download to save the file.",
      "Use Remove to delete a document after confirmation."
    ],
    "note": "If a preview is unavailable, try Download. If an older file downloads blank, check the original and upload a valid copy. If your session expires, sign in again."
  },
  {
    "title": "Resources",
    "route": "/resources",
    "description": "Manage the directory and the Health Care Resources list on Home.",
    "steps": [
      "Select Add resource and enter the required name. Add a website URL beginning with https:// or http:// and optional contact details, then save.",
      "Use Edit to update the name, website, or contact information. A resource without a website appears as plain text on Home.",
      "Use Delete and confirm to remove the resource from both the directory and Home.",
      "Open Home or reload it to check the updated list and links."
    ],
    "note": "Resource names and website links are public on Home. Phone and address details remain in the signed-in directory. Staff can view resources, but only admins can change them."
  },
  {
    "title": "Page content",
    "route": "/admin/content",
    "description": "Edit the Home introduction and its service panels without changing code.",
    "steps": [
      "Update Headline, Supporting copy, or Our Services introduction and save the Home introduction.",
      "Under Page sections, select Home in the Page dropdown. Select Add section to create a panel, or Edit on an existing one.",
      "Enter the section title and text. Choose an existing image, enter its image location, or upload a new image using the form. Save the section.",
      "Use Remove to delete an unwanted panel. Open Home to review the saved text and image."
    ],
    "note": "Each section is saved separately from the introduction. The Page dropdown determines which page owns the section; choose Home for the Home service panels."
  },
  {
    "title": "Users",
    "route": "/admin/users",
    "description": "Manage sign-in accounts under Administration ? Users.",
    "steps": [
      "Select Add user. Enter username, email, first name, last name, user type, and a password. Title, middle name, and suffix are optional.",
      "New accounts default to Staff. Select Admin only for someone who should manage accounts and public website content. Select Save user.",
      "Use Edit on another account to update its details or user type. Leave New password blank to retain its current password.",
      "Use Delete to remove another account after confirmation. Ask another administrator to make changes to your own account."
    ],
    "note": "You cannot edit or delete your own account. New passwords must contain at least 12 characters and no more than 72 UTF-8 bytes. After a role change, the affected user should sign out and back in."
  },
  {
    "title": "User types",
    "route": "/admin/user-types",
    "description": "Maintain user type descriptions under Administration ? User types.",
    "steps": [
      "Select Add user type, enter the required description, and save.",
      "Use the available Edit or Delete actions to maintain custom types. Read any restriction message if an action is blocked.",
      "Assign a type to an account using the Users page."
    ],
    "note": "Admin (1) and Staff (2) have defined permissions. Creating a new type does not grant component access; additional permission rules must be implemented before assigning it for normal portal use."
  },
  {
    "title": "Help and sign-in access",
    "route": "/help",
    "description": "Help is available after signing in; this administrator guide is shown to admins.",
    "steps": [
      "Use the menu to open a component and expand Administration for Users and User types.",
      "Review the access table below when deciding which user type to assign.",
      "If access is denied after a role change, sign out and sign in again. If a save fails, read the on-page message, correct the fields, and retry."
    ],
    "note": "Hiding a menu item is not the only protection: the server also checks permissions on protected requests."
  }
];
}
