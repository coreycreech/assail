# Assail Healthcare

Care-team portal built with Angular and an Express/MySQL API.

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
- `POST /api/auth/login`

The legacy `User.password` field is used only for a transitional login comparison. New password hashes should be stored in a dedicated migration before production use.
