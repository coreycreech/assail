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

The server loads `server/.env` regardless of the startup working directory. Environment variables supplied by the hosting platform take precedence.

For external MySQL on GoDaddy Node.js Hosting, configure `ASSAIL_DB_HOST`, `ASSAIL_DB_PORT`, `ASSAIL_DB_USER`, `ASSAIL_DB_PASSWORD`, and `ASSAIL_DB_NAME` as hosting secrets. Set the name to `assailHealthcare` and use the external server's connection details. When any `ASSAIL_DB_*` setting exists, the app uses that group exclusively and requires host, user, password, and name; it does not mix in hosting-provided `DB_*` values. Local development continues to use `DB_*` when no `ASSAIL_DB_*` settings exist. Deploy this code and the secrets to preview, verify login, then publish to live.

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

The legacy `User.password` field is used only for a transitional login comparison. New password hashes should be stored in a dedicated migration before production use.
