# Assail Healthcare

Care-team portal built with Angular and an Express/MySQL API.

## Database setup

- For a new database, import `database/assailHealthcareDb.sql`.
- For an existing database, apply the SQL files in `database/migrations` in numeric order. Migration `002_client_document_relationship.sql` creates the `Client` table, preserves client IDs already referenced by documents, and adds the foreign key.

## Start

1. Copy `server/.env.example` to `server/.env` (the supplied connection values are the defaults).
2. `npm.cmd install`
3. `npm.cmd start`

Open `http://localhost:4200`. The API runs on `http://localhost:3000`.

## API

- `GET /api/health`
- `GET|POST|PUT|DELETE /api/events`
- `GET|POST|PUT|DELETE /api/pages` and `/api/pages/:pageId/sections`
- `GET|POST|DELETE /api/documents`
- `GET|POST|PUT|DELETE /api/clients`
- `POST /api/auth/login`

The legacy `User.password` field is used only for a transitional login comparison. New password hashes should be stored in a dedicated migration before production use.
