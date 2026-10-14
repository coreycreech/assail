import { Component } from '@angular/core';

@Component({
  selector: 'app-help-page',
  standalone: true,
  styles: [`
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
      <div class="section-head"><div><p class="eyebrow">CARE TEAM SUPPORT</p><h1>Help</h1><p>Understand your access to the care team portal.</p></div></div>
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
              <tr><th scope="row">Resources</th><td>Yes</td><td>Yes</td></tr>
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
export class HelpPageComponent {}
