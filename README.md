# Assail Healthcare

Care-team portal built with Angular and an Express/MySQL API.

## Database setup

- For a new database, import `database/assailHealthcareDb.sql`.
- For an existing database, apply the SQL files in `database/migrations` in numeric order. Migration `002_client_document_relationship.sql` creates the `Client` table, preserves client IDs already referenced by documents, and adds the foreign key. Migration `003_create_billing_table.sql` creates per-client visit and billing records. Migration `004_create_service_table.sql` adds the service catalog and links billing visits to a service. Migration `005_add_services_intro_to_page_info.sql` adds editable introduction text for the Home page's Our Services section. Migration `006_add_page_section_image_location.sql` adds optional image paths to page sections.

## Start

1. Copy `server/.env.example` to `server/.env`, set the database values, and replace `AUTH_TOKEN_SECRET` with a long random secret. Keep that secret stable between server restarts so signed-in editors' tokens stay valid.
2. `npm.cmd install`
3. `npm.cmd run dev`

Open `http://localhost:4200`. The API runs on `http://localhost:3000`.

For production, run `npm.cmd run build`, then `npm.cmd start` (use `npm` on Linux). The Express server serves both the built frontend and `/api` on `PORT`, defaulting to 3000. Configure the hosting web server to forward the site's requests to this Node process. Uploading only the frontend files does not provide the login API.

For local development, the server loads `server/.env` regardless of the startup working directory. Existing environment variables take precedence.

On GoDaddy Node.js Hosting, use the attached hosted database's injected `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` settings. With `NODE_ENV=production`, the app does not load `server/.env` and requires database host, user, password, and name in the environment. Legacy `ASSAIL_DB_*` settings are ignored. Configure a stable `AUTH_TOKEN_SECRET` in hosting secrets. The startup diagnostic identifies this configuration as `hosted-db-v2` and logs the selected host, port, and database without credentials. Deploy to preview, verify login, then publish to live.

## User administration

User types are managed at `/admin/user-types`. Run `008_user_type_access.sql` once after migration 007 for both new and existing databases. It defines Admin as ID 1 and Staff as ID 2, preserves other referenced IDs as restricted legacy types, and adds the `User.userTypeId` → `UserType.userTypeId` foreign key. Review existing type 1/2 assignments before applying it: those IDs determine access. Admin and Staff are protected system types; other types can be created, renamed, or deleted when unused. Additional types have no private portal access until access rules are defined.

Admins can use all portal components. Staff can use calendar, billing, services, documents, clients, and resources, but cannot manage page content, users, or user types. Public Home/About content remains readable. Private APIs require authentication and check the current user role on each request; deleted users and unknown roles are denied. Route guards and navigation apply the same role IDs. After a role change, sign out and in to refresh navigation; backend restrictions apply immediately. Run `node --test server/test/*.test.js` to check the API access matrix and user administration.

The Users sidebar link opens `/admin/users`. Only accounts with `userTypeId = 1` can access the user APIs; the server checks the current database role on every request. User types are selected from the existing `UserType` table. Confirm that type 1 is your administrator role before deployment.

For an existing database, import `database/migrations/007_user_management.sql` before deploying this feature. It expands the password column to support bcrypt hashes and adds a unique username constraint without replacing records. Resolve duplicate usernames before running the migration. New database installs use the updated base schema and should not rerun this migration. New or reset passwords must have at least 12 characters and no more than 72 UTF-8 bytes; leaving the password blank during an edit preserves it. Existing legacy passwords remain usable. Administrators cannot edit or delete their own account. Another administrator must make changes to it. Deletion removes user-management access even for an existing token because these endpoints recheck the user record; other existing portal endpoints retain their existing authorization behavior.

Run the isolated user API checks with `node --test server/test/users.test.js`. These checks do not connect to MySQL or modify hosted data.

## API

- `GET /api/health`
- `GET|POST|PUT|DELETE /api/events`
- `GET /api/pages` and `/api/pages/:pageId/sections` are public; page and section changes require a sign-in token from `POST /api/auth/login`.
- Signed-in editors can list image files in `client/public` and `server/uploads/page-sections` with `GET /api/page-section-images`, and upload an image with `POST /api/page-section-images` (`image` multipart field; PNG, JPEG, WebP, or GIF up to 5 MB).
- `GET|POST|DELETE /api/documents`
- `GET|POST|PUT|DELETE /api/clients`
- `GET|POST|PUT|DELETE /api/services`
- `GET|POST /api/clients/:clientId/billing` and `PUT|DELETE /api/billing/:id`
- `POST /api/auth/login`

User management: `GET|POST /api/users`, `PUT|DELETE /api/users/:id`, and `GET /api/user-types` require an administrator token. Passwords and hashes are never included in user-management responses.
