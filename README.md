# ELEMENT Nagaland — Employee Management System

An Employee Management System designed for ELEMENT — Government of Nagaland. Track, manage, and organize your workforce with a cloud-backed database and per-user accounts.

## Features

- **User Accounts**: Email/password sign-up and sign-in. Each device authenticates with a JWT.
- **Cloud Database**: Employees are stored in Postgres (Vercel Postgres / Neon). Data is shared across devices and browsers as long as you sign in.
- **Dashboard**: Overall metrics including total employees, active staff, and departments.
- **Employee Directory**: Browse employees in Grid or List view. Sort and filter by department and status.
- **Employee Profiles**: Detailed personal, employment, and emergency contact information.
- **Manage Employees**: Add, edit, and remove records.
- **CSV Import & Export**: Backup or migrate data. Imported rows are pushed to the database.
- **Dark Mode**: Toggle between light and dark themes.

## Architecture

- **Frontend**: Vanilla HTML, CSS, JavaScript (`/index.html`, `/assets`). No build step.
- **Backend**: Vercel Serverless Functions in `/api`. Node.js, ES modules.
- **Database**: Postgres via `@neondatabase/serverless` (Neon Marketplace integration on Vercel). Tables auto-created on first request.
- **Auth**: JWT (HS256), 7-day expiry. Passwords hashed with bcryptjs.

## API Endpoints

| Method | Path                     | Auth | Description           |
|--------|--------------------------|------|-----------------------|
| POST   | `/api/auth/signup`       | —    | Create account        |
| POST   | `/api/auth/login`        | —    | Sign in               |
| GET    | `/api/auth/me`           | yes  | Current user          |
| GET    | `/api/employees`         | yes  | List all employees    |
| POST   | `/api/employees`         | yes  | Create employee       |
| GET    | `/api/employees/:id`     | yes  | Get employee          |
| PUT    | `/api/employees/:id`     | yes  | Update employee       |
| DELETE | `/api/employees/:id`     | yes  | Delete employee       |

## Setup

See **[SETUP.md](./SETUP.md)** for step-by-step instructions on:
1. Creating a Vercel Postgres database
2. Setting the `JWT_SECRET` environment variable
3. Redeploying
4. Local development with `vercel dev`

## Usage

- **Sign up** the first time you open the deployed site.
- **Sidebar**: switch between Dashboard and Directory.
- **New Employee**: button at the bottom of the sidebar.
- **CSV Import / Export**: in the Directory view, top-right.
- **Sign Out**: click your avatar in the top-right.

---
**Company**: [http://elementnagaland.in/](http://elementnagaland.in/)