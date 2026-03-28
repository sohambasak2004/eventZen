# Event Management System (Frontend)

React + Vite frontend for an Event Management submission.

## Trainer Requirement Mapping

1. At least 2-3 modules excluding user/auth module

- Event Management: create, update, delete, list events.
- Venue Management: create, update, delete, list venues.
- Attendee Management: create, update, delete, list attendees.

2. User module with registration, login, JWT, and user management

- Implemented in frontend mock API: registration and login flows.
- Session is maintained through a token-like session object in local storage.
- Note: this repository is frontend only, so real backend JWT issuance and user-management endpoints are not part of this codebase yet.

3. Backend + frontend architecture

- Frontend (this repo): React application.
- Backend: to fully satisfy this point for evaluation, connect this UI to a Spring or Node.js backend with real REST endpoints.

## Tech Stack

- React 19
- React Router 7
- Bootstrap 5
- Vite

## Modules and Routes

- /dashboard: summary and module shortcuts
- /events: event management
- /events/new: create event
- /events/:id/edit: edit event
- /venues: venue management
- /attendees: attendee management
- /login and /register: auth module

## Run Locally

1. Install dependencies

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

3. Open the local URL printed by Vite.

## Submission Note

For final trainer submission, pair this frontend with a backend that exposes:

- POST /auth/register
- POST /auth/login
- GET /users and user update endpoints
- Event, Venue, and Attendee CRUD endpoints
