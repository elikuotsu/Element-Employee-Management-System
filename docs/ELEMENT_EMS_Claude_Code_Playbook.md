# ELEMENT Nagaland EMS — Claude Code Prompt Playbook

> **How to use this:** Feed each prompt to Claude Code **one at a time**, in order.
> Wait for Claude Code to finish and confirm before moving to the next.
> Each prompt builds on the output of the previous one.

---

## PHASE 1 — Foundation (Weeks 1–4)

---

### PROMPT 1 — Project Scaffold

```
Create a new full-stack project called `element-ems` with the following structure:

Frontend: React 18 + TypeScript, built with Vite
Backend: Node.js + Express + TypeScript
ORM: Prisma
Database: SQLite (file: ems.sqlite in the project root)
Styling: Tailwind CSS

Directory layout:
  element-ems/
    client/          ← Vite + React frontend
    server/          ← Express backend
    prisma/          ← Prisma schema and migrations
    uploads/         ← file storage for documents
    package.json     ← root with scripts to run both

Set up the root package.json with these scripts:
  "dev": runs both client and server concurrently
  "build": builds both
  "start": runs the production server with PM2

Install and configure:
- concurrently (to run both dev servers together)
- cors on the express server
- dotenv for environment variables
- A .env file with: DATABASE_URL, JWT_SECRET, PORT=3000, CLIENT_URL=http://localhost:5173

Create a CLAUDE.md file at the root summarising the stack, folder structure, and key conventions (use TypeScript everywhere, Prisma for all DB access, JWT auth via httpOnly cookies).
```

---

### PROMPT 2 — Prisma Schema (Full Data Model)

```
In the `prisma/schema.prisma` file, define the full data model for the ELEMENT EMS system using SQLite as the provider.

Create these models:

Department
  id, name, headId (optional FK to Employee), parentId (optional self-relation for sub-departments), createdAt

Employee
  id, name, email (unique), phone, grade, status (ACTIVE/INACTIVE/ON_LEAVE), joinDate, avatarUrl
  departmentId (FK), managerId (optional FK to self)
  createdAt, updatedAt

User (authentication — linked 1:1 to Employee)
  id, employeeId (unique FK), passwordHash, role (SUPER_ADMIN / HR_ADMIN / DEPT_HEAD / TEAM_LEAD / EMPLOYEE / VIEWER)
  lastLogin, createdAt

LeavePolicy
  id, grade, leaveType (CASUAL / EARNED / SICK / MATERNITY / PATERNITY / COMP_OFF / LWP)
  daysAllowed, carryForward (Boolean), createdAt

LeaveBalance
  id, employeeId (FK), leaveType, year, totalDays, usedDays, createdAt

LeaveRequest
  id, employeeId (FK), leaveType, startDate, endDate, reason, status (PENDING/APPROVED/REJECTED/CANCELLED)
  approvedById (optional FK to Employee), approverComment, appliedAt, resolvedAt

Attendance
  id, employeeId (FK), date, checkIn (DateTime optional), checkOut (DateTime optional)
  status (PRESENT/ABSENT/LATE/HALF_DAY/HOLIDAY/WEEKEND), overtimeMinutes, note
  createdAt

PerformanceReview
  id, employeeId (FK), reviewerId (FK to Employee), cycle (string e.g. "Q1-2026"), status (DRAFT/SUBMITTED/CALIBRATED/CLOSED)
  rating (Float optional), goalsJson (Json), feedback, createdAt, updatedAt

Document
  id, employeeId (FK), fileName, fileType, filePath, uploadedById (FK to User), createdAt

Notification
  id, userId (FK to User), type, title, message, isRead, createdAt

AuditLog
  id, userId (FK to User), action, entity, entityId, oldValue (optional Json), newValue (optional Json), createdAt

Holiday
  id, name, date, isNational (Boolean), createdAt

After writing the schema, run:
  npx prisma migrate dev --name init

Then run:
  npx prisma generate
```

---

### PROMPT 3 — Auth System (JWT + bcrypt)

```
Implement a complete authentication system in the server using JWT and bcrypt. No third-party auth service.

Create these files:
  server/src/middleware/auth.ts      ← JWT verification middleware
  server/src/routes/auth.ts          ← Login, logout, me endpoints
  server/src/utils/jwt.ts            ← Sign and verify JWT helpers
  server/src/utils/password.ts       ← bcrypt hash and compare helpers

Endpoints to implement:
  POST /api/auth/login
    - Accept email + password
    - Find User by Employee email
    - Compare password with bcrypt
    - On success: sign JWT containing { userId, role, employeeId }, set as httpOnly cookie (name: "ems_token", 7-day expiry)
    - Return: { employee: { id, name, email, role } }
    - On failure: return 401 with generic message

  POST /api/auth/logout
    - Clear the httpOnly cookie
    - Return: { success: true }

  GET /api/auth/me
    - Protected by auth middleware
    - Return the currently logged-in employee's profile + role

Auth middleware (auth.ts):
    - Read JWT from httpOnly cookie
    - Verify with JWT_SECRET from .env
    - Attach { userId, role, employeeId } to req.user
    - Return 401 if missing or invalid

Also create a seeder script at server/src/seed.ts that:
  - Creates one Super Admin user (email: admin@element.gov.in, password: Admin@1234)
  - Creates 3 sample departments: Administration, Field Operations, Technical
  - Creates 5 sample employees spread across those departments

Run the seeder: npx ts-node server/src/seed.ts
```

---

### PROMPT 4 — RBAC Middleware

```
Create a role-based access control (RBAC) system for the Express server.

Create server/src/middleware/rbac.ts that exports a function:
  requireRole(...roles: Role[]) → Express middleware

The middleware:
  - Reads req.user (set by auth middleware)
  - If the user's role is not in the allowed list, returns 403
  - Role hierarchy: SUPER_ADMIN > HR_ADMIN > DEPT_HEAD > TEAM_LEAD > EMPLOYEE > VIEWER

Create a permissions config at server/src/config/permissions.ts that defines:
  - Which roles can CREATE, READ, UPDATE, DELETE each resource type (Employee, Leave, Attendance, Review, Report, User, Settings)
  - Export this as a typed object

Then apply RBAC to all existing routes:
  - POST/PUT/DELETE /api/employees → HR_ADMIN and above
  - GET /api/employees → TEAM_LEAD and above
  - GET /api/employees/:id → EMPLOYEE (own profile only), TEAM_LEAD and above for others
  - /api/auth/* → public (no auth required)

Write a short README comment at the top of permissions.ts explaining how to add new permissions.
```

---

### PROMPT 5 — Employee CRUD API

```
Build the full Employee REST API in the Express server.

Create server/src/routes/employees.ts with these endpoints (all protected by auth middleware):

GET /api/employees
  - Query params: search (name/email), departmentId, status, grade, page, limit
  - Return paginated list with total count
  - Include department name and manager name

GET /api/employees/:id
  - Return full profile: personal info + department + manager + leaveBalances + recentAttendance (last 7 days)
  - Employees can only fetch their own record unless TEAM_LEAD or above

POST /api/employees
  - Requires HR_ADMIN or above
  - Accept all Employee fields + initial password
  - Create Employee + User records in a Prisma transaction
  - Hash the password with bcrypt
  - Auto-create LeaveBalance records for all leave types for current year (from LeavePolicy for their grade)
  - Return created employee

PUT /api/employees/:id
  - Requires HR_ADMIN or above (or own record for EMPLOYEE role — limited fields only: phone, avatarUrl, emergencyContact)
  - Update employee fields
  - Write to AuditLog

DELETE /api/employees/:id
  - Requires SUPER_ADMIN
  - Soft delete: set status to INACTIVE, do not remove the record

POST /api/employees/import
  - Requires HR_ADMIN or above
  - Accept a CSV file upload (use multer)
  - Parse rows and bulk-create employees
  - Return a summary: { created: N, skipped: N, errors: [...] }

GET /api/employees/export
  - Requires HR_ADMIN or above
  - Return CSV of all active employees with all fields

Add input validation using zod on all POST/PUT routes.
```

---

### PROMPT 6 — Department API

```
Build the Department REST API in server/src/routes/departments.ts.

Endpoints:

GET /api/departments
  - Return all departments with: headEmployee name, employeeCount, parentDepartment name

GET /api/departments/:id
  - Return department + list of employees in it + subdepartments

POST /api/departments
  - Requires HR_ADMIN or above
  - Fields: name, headId (optional), parentId (optional)

PUT /api/departments/:id
  - Requires HR_ADMIN or above
  - Can update name, headId, parentId

DELETE /api/departments/:id
  - Requires SUPER_ADMIN
  - Only allowed if department has 0 employees

POST /api/employees/:id/transfer
  - Requires HR_ADMIN or above
  - Transfer an employee to a new department
  - Write to AuditLog with old and new departmentId

Mount this router in the main server/src/index.ts file.
```

---

### PROMPT 7 — Frontend: Auth + Layout Shell

```
Build the React frontend foundation in the client/ directory.

1. Set up React Router v6 with these routes:
   /login               → LoginPage (public)
   /                    → redirect to /dashboard
   /dashboard           → DashboardPage (protected)
   /employees           → EmployeeDirectoryPage (protected)
   /employees/:id       → EmployeeProfilePage (protected)
   /leaves              → LeaveManagementPage (protected)
   /attendance          → AttendancePage (protected)
   /performance         → PerformancePage (protected)
   /reports             → ReportsPage (protected)
   /settings            → SettingsPage (SUPER_ADMIN / HR_ADMIN only)

2. Create an AuthContext (client/src/context/AuthContext.tsx):
   - Calls GET /api/auth/me on app load
   - Stores { employee, role, isLoading }
   - Provides login(email, password) and logout() functions
   - ProtectedRoute component: redirects to /login if not authenticated

3. Create the App Shell layout (client/src/components/Layout.tsx):
   - Left sidebar with logo ("ELEMENT Nagaland") and nav links
   - Nav links show/hide based on role
   - Top bar with logged-in user name, avatar, and logout button
   - Main content area

4. Design system — apply this green theme via Tailwind:
   - Primary: #2D6A4F (deep forest green)
   - Accent: #52B788 (leaf green)
   - Background: #F8FAF9
   - Text: #1B2E27
   - Cards: white with subtle green border
   - Sidebar: dark green (#1B4332) with white text

5. Build the LoginPage:
   - Centered card with Element Nagaland logo text and tagline
   - Email + password fields
   - Error state display
   - On success: redirect to /dashboard

Use TanStack Query (React Query) for all API calls. Set up the QueryClient in main.tsx.
```

---

### PROMPT 8 — Frontend: Dashboard Page

```
Build the Dashboard page at client/src/pages/DashboardPage.tsx.

The dashboard must show:

Top KPI cards (fetch from GET /api/dashboard/stats):
  - Total Employees (active count)
  - On Leave Today (employees with approved leave today)
  - Present Today (attendance check-ins today)
  - Pending Leave Requests (awaiting the logged-in user's approval)

Charts (use Recharts library):
  - Bar chart: headcount by department
  - Donut chart: leave type distribution for current month
  - Line chart: attendance trend for last 30 days

Recent Activity feed (last 10 entries from AuditLog):
  - Show actor name, action, entity, and time ago

Quick Actions section (role-based):
  - HR Admin: "Add Employee", "Process Leave", "Generate Report"
  - Employee: "Apply for Leave", "View My Attendance", "View My Profile"

Also create the backend endpoint:
  GET /api/dashboard/stats
  - Requires authentication
  - Returns all the numbers above in a single response
  - For EMPLOYEE role: return only their personal stats

Make the page responsive: KPI cards stack 2x2 on tablet, 1 column on mobile.
```

---

## PHASE 2 — Leave & Attendance (Weeks 5–8)

---

### PROMPT 9 — Leave Policy & Balance API

```
Build the leave policy and balance management APIs.

Create server/src/routes/leave.ts with:

GET /api/leave/policies
  - Return all LeavePolicies grouped by grade
  - Requires HR_ADMIN or above

POST /api/leave/policies
  - Create or update a leave policy (upsert by grade + leaveType)
  - Requires HR_ADMIN or above
  - Fields: grade, leaveType, daysAllowed, carryForward

GET /api/leave/balance/:employeeId
  - Return all LeaveBalance rows for the employee for current year
  - EMPLOYEE can only fetch own balance

GET /api/leave/balance/me
  - Return the logged-in employee's leave balances

POST /api/leave/balance/initialize
  - Requires HR_ADMIN or above
  - Initialize leave balances for all active employees for a given year
  - Skip employees who already have balances for that year
  - Use their grade's LeavePolicy to set totalDays

Also create:
GET /api/leave/holidays
  - Return all holidays for current year, sorted by date

POST /api/leave/holidays
  - Requires HR_ADMIN or above
  - Fields: name, date, isNational

Add zod validation on all POST routes.
```

---

### PROMPT 10 — Leave Request Workflow API

```
Add leave request endpoints to server/src/routes/leave.ts.

GET /api/leave/requests
  - Query params: status, employeeId, startDate, endDate, leaveType, page, limit
  - EMPLOYEE: returns only their own requests
  - TEAM_LEAD: returns requests from their direct reports
  - HR_ADMIN / DEPT_HEAD: returns all requests in their scope
  - SUPER_ADMIN / HR_ADMIN: returns all requests

POST /api/leave/requests
  - EMPLOYEE and above can apply
  - Fields: leaveType, startDate, endDate, reason
  - Validate: startDate must be in future, endDate >= startDate
  - Check leave balance: if insufficient, return 400 with current balance
  - Exclude weekends and holidays from day count
  - Create request with status PENDING
  - Create a Notification for the direct manager

PUT /api/leave/requests/:id/approve
  - Requires TEAM_LEAD or above
  - Can only approve requests from their direct reports (TEAM_LEAD/DEPT_HEAD) or all (HR_ADMIN+)
  - Set status to APPROVED, approvedById, resolvedAt
  - Deduct days from LeaveBalance
  - Create Notification for the employee
  - Write to AuditLog

PUT /api/leave/requests/:id/reject
  - Same permissions as approve
  - Requires a comment
  - Set status to REJECTED, do not deduct balance
  - Create Notification for the employee

PUT /api/leave/requests/:id/cancel
  - Employee can cancel their own PENDING request only
  - HR_ADMIN can cancel any pending request
  - Restore balance if request was already APPROVED

GET /api/leave/calendar
  - Returns approved leaves for a given month/year
  - Optional: filter by departmentId
  - Used to show team availability
```

---

### PROMPT 11 — Attendance API

```
Build the attendance tracking API in server/src/routes/attendance.ts.

Endpoints:

POST /api/attendance/check-in
  - Employee checks in for today
  - Prevent duplicate check-in for same day
  - Auto-flag as LATE if check-in is after 9:30 AM
  - Return the created attendance record

POST /api/attendance/check-out
  - Employee checks out for today
  - Must have checked in first
  - Calculate overtime if checkout is after 6:30 PM

GET /api/attendance/today
  - Return today's attendance record for the logged-in employee

GET /api/attendance/my
  - Logged-in employee's attendance for a given month/year (query params)
  - Return list of days + summary: present days, absent days, late count, total overtime

GET /api/attendance/employee/:id
  - Requires TEAM_LEAD or above
  - Return attendance for any employee, with date range filter

GET /api/attendance/report
  - Requires HR_ADMIN or above
  - Query params: departmentId, startDate, endDate
  - Return aggregated report: by employee, total present/absent/late
  - Include percentage attendance

POST /api/attendance/manual
  - Requires HR_ADMIN or above
  - Manually create or edit an attendance record for any employee/date
  - Write to AuditLog with reason

GET /api/attendance/team
  - TEAM_LEAD or above
  - Today's attendance status for all their direct reports
  - Used for a "who's in today" widget on dashboard
```

---

### PROMPT 12 — Frontend: Leave Module UI

```
Build the full Leave Management UI in the React frontend.

Pages and components needed:

1. Leave Balance Widget (client/src/components/leave/LeaveBalanceWidget.tsx)
   - Card showing all leave types with used/total bar progress
   - Used on employee profile and self-service

2. LeaveApplicationPage (client/src/pages/leave/LeaveApplicationPage.tsx)
   - Form: leave type selector, date range picker, reason textarea
   - Show remaining balance for selected type (updates as type changes)
   - Show working days count (excluding weekends and holidays) as dates are picked
   - Submit button with loading state
   - On success: show toast, redirect to leave history

3. LeaveListPage (client/src/pages/leave/LeaveListPage.tsx)
   - Tabs: "My Requests" and (for managers) "Team Requests"
   - Table with: employee name, type, dates, days, status badge, actions
   - Status badges: yellow=Pending, green=Approved, red=Rejected, grey=Cancelled
   - Approve/Reject buttons for managers (open a modal to add comment)
   - Filter bar: status, date range, leave type

4. LeaveCalendarPage (client/src/pages/leave/LeaveCalendarPage.tsx)
   - Monthly calendar grid
   - Show holidays in light red
   - Show approved leaves per employee as colored bars
   - Department filter dropdown
   - Month/year navigation

Use TanStack Query for all data fetching. Use toast notifications for action feedback. Make everything mobile-responsive.
```

---

### PROMPT 13 — Frontend: Attendance UI

```
Build the Attendance module UI.

1. AttendancePage (client/src/pages/AttendancePage.tsx)
   Role-based view:
   
   For EMPLOYEE:
     - Check-in / Check-out button (shows current state, disabled if already done)
     - Today's status card: checked-in at, checked-out at, total hours, LATE badge if applicable
     - Monthly attendance calendar: colour each day (green=present, red=absent, yellow=late, grey=weekend/holiday)
     - Monthly summary: total present, absent, late, overtime hours

   For TEAM_LEAD / DEPT_HEAD / HR_ADMIN:
     - "Team Today" panel: list of direct reports with their current status (Present / Absent / Late / Not Checked In)
     - Filter to see any employee's monthly attendance
     - Search by employee name

2. AttendanceReportPage (client/src/pages/attendance/AttendanceReportPage.tsx)
   - Requires HR_ADMIN or above
   - Date range picker and department filter
   - Attendance summary table: one row per employee, columns for present/absent/late/overtime
   - Export to CSV button (calls GET /api/attendance/report with format=csv)

All API calls via TanStack Query. Use Recharts for the monthly trend line chart.
```

---

## PHASE 3 — Performance & Documents (Weeks 9–12)

---

### PROMPT 14 — Performance Review API

```
Build the Performance Review API in server/src/routes/performance.ts.

Endpoints:

GET /api/performance/reviews
  - EMPLOYEE: their own reviews only
  - MANAGER and above: their direct reports' reviews + own
  - HR_ADMIN+: all reviews
  - Query params: cycle, status, employeeId

POST /api/performance/reviews
  - Requires HR_ADMIN or above
  - Initiate a review cycle for a list of employees
  - Fields: employeeIds[], reviewerIds[] (mapped pairs), cycle (e.g. "Annual-2025"), dueDate
  - Create PerformanceReview records with status DRAFT

GET /api/performance/reviews/:id
  - Return full review with employee, reviewer, goals, feedback

PUT /api/performance/reviews/:id/self-assessment
  - Employee submits their own self-assessment
  - Fields: goalsJson (self-rated goals), selfFeedback
  - Only if they are the reviewee and status is DRAFT

PUT /api/performance/reviews/:id/manager-review
  - Reviewer (manager) submits their assessment
  - Fields: rating (1-5), goalsJson (manager ratings per goal), feedback
  - Sets status to SUBMITTED
  - Creates Notification for HR

PUT /api/performance/reviews/:id/calibrate
  - Requires HR_ADMIN or above
  - Override or confirm rating after calibration
  - Sets status to CALIBRATED

PUT /api/performance/reviews/:id/close
  - Requires HR_ADMIN or above
  - Closes the review, makes it visible to employee
  - Sets status to CLOSED
  - Creates Notification for employee

GET /api/performance/goals/:employeeId
  - Return all goals for the employee across all review cycles

Add zod validation. Write to AuditLog on all status changes.
```

---

### PROMPT 15 — Document Management API

```
Build the Document Management API in server/src/routes/documents.ts.

Use multer for file uploads. Store files in the /uploads folder.
File naming convention: {employeeId}/{timestamp}_{originalFilename}
Max file size: 10MB. Allowed types: pdf, jpg, jpeg, png, docx.

Endpoints:

GET /api/documents/employee/:employeeId
  - Return all documents for an employee
  - EMPLOYEE can only access own documents
  - HR_ADMIN and above can access any employee's documents

POST /api/documents/upload/:employeeId
  - Requires HR_ADMIN or above (or employee uploading their own)
  - Accept multipart/form-data with fields: file, documentType (string label e.g. "ID Proof")
  - Save file to disk, create Document record in DB
  - Return document metadata

GET /api/documents/:id/download
  - Stream the file back as a download response
  - Enforce access: employee can only download their own docs

DELETE /api/documents/:id
  - Requires HR_ADMIN or above
  - Delete DB record AND the file from disk
  - Write to AuditLog

POST /api/documents/generate-letter
  - Requires HR_ADMIN or above
  - Fields: employeeId, letterType (OFFER_LETTER / EXPERIENCE_LETTER / SALARY_SLIP)
  - Generate a filled letter as a text/html string using employee data
  - Return the HTML for preview (frontend will handle print/save)

Create letter templates as simple HTML strings in server/src/templates/:
  - offerLetter.ts
  - experienceLetter.ts
  - salarySlip.ts

Each template is a function that takes an Employee object and returns HTML.
```

---

### PROMPT 16 — Reporting API

```
Build the Reports API in server/src/routes/reports.ts. Requires HR_ADMIN or above for all endpoints.

GET /api/reports/headcount
  - Total active employees, grouped by: department, grade, status
  - Optional: date range for join date filter

GET /api/reports/leave-utilization
  - By leave type and department: totalDaysAllowed vs totalDaysUsed across all employees
  - For a given year (query param)

GET /api/reports/attendance-summary
  - Aggregated attendance by department for a given month
  - Columns: department, total employees, avg attendance %, total late, total absent

GET /api/reports/attrition
  - Employees who left (status=INACTIVE) in a given period
  - Grouped by department

GET /api/reports/custom
  - Flexible endpoint
  - Query params: entity (employee | leave | attendance), filters (departmentId, grade, dateFrom, dateTo, status)
  - Return a flat array of rows matching the filters

For all report endpoints, add a format query param:
  - format=json (default): return JSON
  - format=csv: return a CSV file download

Create a helper at server/src/utils/toCsv.ts that converts an array of objects to CSV string.
```

---

### PROMPT 17 — Frontend: Employee Directory & Profile Pages

```
Build the Employee Directory and Employee Profile pages.

1. EmployeeDirectoryPage (client/src/pages/employees/EmployeeDirectoryPage.tsx)
   - Grid/List toggle (cards vs table rows)
   - Search bar (name or email)
   - Filters: Department dropdown, Status, Grade
   - Each employee card shows: avatar, name, designation/grade, department, email, phone, status badge
   - Click card → navigate to /employees/:id
   - "Add Employee" button (HR_ADMIN+ only) → opens AddEmployeeModal
   - Pagination (20 per page)
   - "Export CSV" button (HR_ADMIN+ only)

2. AddEmployeeModal
   - Form fields: name, email, phone, grade, departmentId, managerId, joinDate, initial password
   - Inline validation with zod
   - On success: close modal, refetch list, show toast

3. EmployeeProfilePage (client/src/pages/employees/EmployeeProfilePage.tsx)
   - Header: large avatar, name, department, grade, status, join date
   - Edit button (own record or HR_ADMIN+)
   - Tabs:
     → Info: personal details, emergency contact, manager name
     → Leave: LeaveBalanceWidget + their leave request history
     → Attendance: monthly calendar + summary stats
     → Performance: list of review cycles + ratings
     → Documents: file list with download buttons + upload button (HR_ADMIN+)
   - "Generate Letter" dropdown (HR_ADMIN+): offer / experience / salary slip

All data fetched via TanStack Query. Loading skeletons while fetching. Error states handled gracefully.
```

---

### PROMPT 18 — Frontend: Performance & Reports UI

```
Build the Performance and Reports pages.

1. PerformancePage (client/src/pages/PerformancePage.tsx)
   Role-based content:
   
   EMPLOYEE view:
     - "My Reviews" tab: list of review cycles, each showing status and final rating when closed
     - Click a review → open a detail page with goals table + manager feedback (if closed)
     - Self-assessment form (if review is in DRAFT and they haven't submitted yet)

   MANAGER / HR_ADMIN view:
     - "Team Reviews" tab: list of all reviews in their scope, grouped by cycle
     - Click → full review form (rate goals, add feedback, submit)
     - Filter by: cycle, status, department

   HR_ADMIN only:
     - "Initiate Review Cycle" button → modal to select employees + reviewers + cycle name

2. ReportsPage (client/src/pages/ReportsPage.tsx)
   - Requires HR_ADMIN or above
   - Sidebar with report types: Headcount, Leave Utilization, Attendance Summary, Attrition, Custom
   - Each report type:
     → Filter inputs at top
     → "Generate" button
     → Results displayed as table + chart (Recharts)
     → "Export CSV" button
   
   Charts to include:
     - Headcount: bar chart by department
     - Leave utilization: stacked bar chart (used vs remaining)
     - Attendance: heatmap or bar chart by department
     - Attrition: line chart over time

3. SettingsPage (client/src/pages/SettingsPage.tsx)
   - Tabs: Departments, Leave Policies, Holidays, User Management
   - Leave Policies tab: table of all policies, editable inline, save button
   - Holidays tab: list with add/delete (only future holidays can be deleted)
   - User Management tab: list of users with their role, reset password button
```

---

## PHASE 4 — Polish & Production (Weeks 13–16)

---

### PROMPT 19 — Notification System

```
Build the full notification system.

Backend:

1. GET /api/notifications
   - Return all notifications for logged-in user
   - Query param: unreadOnly=true

2. PUT /api/notifications/:id/read
   - Mark a notification as read

3. PUT /api/notifications/read-all
   - Mark all notifications as read for the user

4. Notification service (server/src/services/notificationService.ts)
   - createNotification(userId, type, title, message) → creates a DB record
   - sendEmail(to, subject, body) → uses Nodemailer with SMTP config from .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
   - notifyLeaveApproval(leaveRequest) → notifies employee
   - notifyLeaveApplication(leaveRequest) → notifies manager
   - notifyReviewDue(review) → notifies reviewee and reviewer
   - notifyAnnouncement(announcement, userIds[]) → bulk notify

5. POST /api/announcements
   - Requires HR_ADMIN or above
   - Fields: title, body, targetRoles[] (optional; if empty, notifies all)
   - Creates Notification for all matching users

6. GET /api/announcements
   - Return last 10 announcements (all users)

Frontend:

1. Notification bell icon in the top bar
   - Shows unread count badge
   - Click → dropdown panel listing recent notifications
   - "Mark all read" button
   - Each item: icon by type, title, time ago, link to relevant page

2. AnnouncementBanner on Dashboard
   - Shows latest unread announcement if any
   - Dismiss button
```

---

### PROMPT 20 — Audit Log & Backup System

```
Finalize the audit logging and set up automated backup.

1. AuditLog enhancement:
   - Create server/src/middleware/auditLogger.ts
   - Wrap all mutating routes (POST, PUT, DELETE) to automatically log:
     actor (userId), action (CREATE/UPDATE/DELETE), entity (table name), entityId, before/after values
   - Keep JSON snapshots of before/after state
   - Do not log auth events or GET requests

2. GET /api/audit-logs
   - Requires SUPER_ADMIN
   - Query params: entity, entityId, userId, dateFrom, dateTo, page, limit
   - Return paginated audit log entries with actor name

3. Backup script (scripts/backup.sh):
   - Copy ems.sqlite → backups/ems_backup_YYYY-MM-DD.sqlite
   - Copy uploads/ → backups/uploads_YYYY-MM-DD/
   - Delete backups older than 30 days
   - Log success/failure to backups/backup.log

4. Add a Windows batch equivalent: scripts/backup.bat

5. Add PM2 configuration file (ecosystem.config.js):
   - App name: element-ems
   - Script: dist/server/src/index.js
   - Env: production settings
   - max_restarts: 10, restart_delay: 3000

6. Create a setup guide at SETUP.md:
   - How to install Node.js on Windows
   - How to run npm install + build
   - How to start with PM2
   - How to set up Windows Task Scheduler for daily backup script
   - How to assign static LAN IP
   - How employees access: http://[LAN-IP]:3000
```

---

### PROMPT 21 — Security Hardening

```
Apply security hardening to the Express server.

Install and configure:
  helmet (HTTP security headers)
  express-rate-limit (rate limiting)
  express-validator (input sanitization)

Apply:

1. helmet() globally — sets X-Frame-Options, CSP, HSTS, etc.

2. Rate limiter on auth routes:
   - /api/auth/login: max 10 requests per 15 minutes per IP
   - All other routes: max 200 requests per minute per IP

3. Add Content-Security-Policy that allows only the React app origin

4. Ensure all cookies use:
   httpOnly: true
   secure: process.env.NODE_ENV === 'production'
   sameSite: 'strict'

5. Validate and sanitize all inputs:
   - Strip HTML tags from all string inputs
   - Ensure no SQL injection is possible (Prisma parameterizes everything by default — confirm this is the case)

6. Add CORS configuration:
   - Allow only CLIENT_URL from .env
   - Credentials: true

7. Check all file upload endpoints:
   - Reject files with non-whitelisted MIME types (even if extension looks correct)
   - Scan filename for path traversal attempts (e.g. "../../etc/passwd")
   - Save files with a generated UUID name, never the original filename

8. Create server/src/utils/sanitize.ts with helpers:
   - sanitizeString(str): trims, strips HTML
   - sanitizeFilename(name): removes special chars, path separators

Add a security checklist comment block at the top of server/src/index.ts confirming each measure is in place.
```

---

### PROMPT 22 — Mobile Responsiveness & Accessibility Audit

```
Audit and fix the entire React frontend for mobile responsiveness and accessibility.

Mobile (target: 375px minimum width, tablet: 768px):
  - All pages must display correctly at 375px, 768px, and 1280px widths
  - Sidebar collapses to a hamburger menu on mobile
  - All tables become scrollable or collapse to card view on mobile
  - Forms stack vertically on mobile
  - Buttons must be minimum 44px tall for touch targets
  - Leave application and check-in/out must work on mobile

Accessibility (WCAG 2.1 AA):
  - All interactive elements must be keyboard navigable (tab order makes sense)
  - All form inputs must have associated <label> elements
  - All images (including avatars) must have meaningful alt text or alt="" if decorative
  - All icon-only buttons must have aria-label
  - Color contrast must meet 4.5:1 minimum for normal text, 3:1 for large text
  - Modals must trap focus and be closable with Escape key
  - Error messages must be linked to their inputs via aria-describedby
  - Page title (document.title) must update on navigation to describe the current page
  - Use semantic HTML: <main>, <nav>, <header>, <section>, <article> appropriately

Run a self-audit:
  - Check every page listed in the routes
  - Fix issues in-place
  - Output a short summary of what was fixed
```

---

### PROMPT 23 — E2E Tests with Playwright

```
Write end-to-end tests using Playwright for the most critical user journeys.

Set up Playwright in a new /tests directory at the project root.

Write tests for these flows:

1. Auth flow
   - Login with valid credentials → lands on dashboard
   - Login with wrong password → shows error message
   - Logged-out user visiting /dashboard → redirected to /login
   - Logout → redirected to /login, cookie cleared

2. Employee management (HR Admin)
   - Create a new employee with all fields
   - Search for that employee in the directory
   - Open their profile
   - Edit their phone number
   - Deactivate the employee

3. Leave workflow (end-to-end)
   - Employee applies for 2 days of Casual Leave
   - Manager logs in and sees pending request
   - Manager approves with a comment
   - Employee's leave balance is reduced by 2

4. Attendance
   - Employee checks in → status shows "Checked In"
   - Employee checks out → shows hours worked
   - HR views today's team attendance report

5. Reports
   - HR Admin generates Headcount report
   - Exports as CSV — verify file downloads

Each test must use separate test accounts seeded in a test database.
Add a npm script: "test:e2e" that runs all Playwright tests.
Include a CI-ready playwright.config.ts with baseURL pointing to localhost:3000.
```

---

### PROMPT 24 — Final Production Build & Deployment Package

```
Prepare the project for deployment on a LAN server.

1. Production build:
   - client/: run vite build → outputs to client/dist/
   - server/: run tsc → outputs to dist/
   - Configure Express to serve client/dist/ as static files in production
   - All /api/* routes serve the API; everything else serves index.html (SPA fallback)

2. Environment configuration:
   - Create .env.example with all required variables and descriptions
   - Create .env.production.example for production-specific values
   - Ensure NODE_ENV=production disables verbose error messages (never expose stack traces to the client)

3. PM2 ecosystem file (ecosystem.config.js):
   - Start the compiled server
   - Set NODE_ENV=production
   - Log output to logs/app.log and logs/error.log

4. Deployment scripts:
   - scripts/deploy.sh: pull latest code, npm install, build, restart PM2
   - scripts/first-run.sh: run migrations, seed admin user, initialize leave balances for current year, start PM2

5. Admin first-run wizard:
   - When no departments exist in the DB, redirect Super Admin to /setup instead of /dashboard
   - /setup page: multi-step wizard
     Step 1: Create departments (add/remove rows, submit)
     Step 2: Import employees via CSV upload (or skip)
     Step 3: Set leave policies per grade (table with defaults pre-filled)
     Step 4: Initialize leave balances for all employees (one button click)
     Step 5: Done → redirect to /dashboard

6. README.md (complete):
   - What the system does
   - Tech stack
   - Local development setup (step by step)
   - Production deployment on LAN (step by step, Windows and Linux)
   - How to add the first admin user
   - How to run backups
   - How to update the system
   - Troubleshooting common issues
```

---

## Done ✅

After Prompt 24, you will have a fully functional, production-ready Employee Management System for ELEMENT Nagaland — running on a local LAN server, zero cloud cost, with:

- Multi-user authentication + RBAC
- Employee directory with bulk import/export
- Leave management with approval workflow
- Attendance tracking
- Performance review cycles
- Document management + letter generation
- Analytics dashboard + custom reports
- Notification system
- Audit logging + automated backup
- Mobile-responsive + accessible UI
- E2E tested + PM2 deployment-ready
