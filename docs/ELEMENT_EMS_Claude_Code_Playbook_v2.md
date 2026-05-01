# ELEMENT Nagaland EMS — Claude Code Prompt Playbook v2
### GitHub + Vercel + Neon + Cloudflare R2 + Resend (100% Free Stack)

> **How to use this:** Feed each prompt to Claude Code **one at a time**, in order.
> Wait for Claude Code to finish and confirm before moving to the next.
> Each prompt builds on the output of the previous one.

---

## Infrastructure Setup (Do This First — Outside Claude Code)

Before running any prompts, set up these free accounts and collect the credentials you'll need.

| Service | Purpose | Sign up at | Free tier |
|---|---|---|---|
| **GitHub** | Code hosting + CI/CD trigger | github.com | Unlimited private repos |
| **Vercel** | Frontend + API hosting (auto-deploys from GitHub) | vercel.com | 100GB bandwidth, 1M fn calls/month |
| **Neon** | PostgreSQL database (serverless) | neon.tech | 3GB storage, scale-to-zero |
| **Cloudflare R2** | Document/file storage (S3-compatible) | cloudflare.com | 10GB storage, zero egress fees |
| **Resend** | Transactional email (leave approvals, notifications) | resend.com | 3,000 emails/month |

**Steps:**
1. Create a GitHub repo called `element-ems` (private)
2. Create a Neon project → copy the `DATABASE_URL` connection string
3. Create a Cloudflare R2 bucket called `element-ems-docs` → generate an API token with R2 read/write permissions → copy `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
4. Create a Resend account → verify your sending domain (or use the sandbox for development) → copy `RESEND_API_KEY`
5. Create a Vercel project linked to the GitHub repo → add all env vars in Vercel dashboard

---

## PHASE 1 — Foundation (Weeks 1–4)

---

### PROMPT 1 — Project Scaffold

```
Create a new full-stack project called `element-ems` as a Next.js 14 app using the App Router.

This is a single Next.js project — the frontend (React) and backend (API routes) live together. No separate Express server. No separate client/ folder.

Stack:
  Framework:    Next.js 14 (App Router) + TypeScript
  Styling:      Tailwind CSS
  ORM:          Prisma
  Database:     PostgreSQL via Neon (serverless)
  State/fetch:  TanStack Query (React Query) v5
  Auth:         Custom JWT + bcrypt stored in httpOnly cookies
  File storage: Cloudflare R2 (S3-compatible)
  Email:        Resend
  Deployment:   Vercel (single project, zero config)

Directory layout:
  element-ems/
    app/
      (auth)/
        login/          ← public login page
      (dashboard)/
        layout.tsx      ← protected shell with sidebar
        dashboard/
        employees/
        leaves/
        attendance/
        performance/
        reports/
        settings/
        setup/          ← first-run wizard
      api/              ← all backend API routes live here
        auth/
        employees/
        departments/
        leave/
        attendance/
        performance/
        documents/
        reports/
        notifications/
        announcements/
        dashboard/
        audit-logs/
    components/         ← shared UI components
    lib/                ← shared utilities (db, auth, r2, email, etc.)
    prisma/
      schema.prisma
    public/
    .env.local          ← local dev secrets (never committed)
    .env.example        ← template with all required keys
    next.config.ts
    tailwind.config.ts

Create a .env.local file with these variables (leave values blank for now except JWT_SECRET):
  DATABASE_URL=
  JWT_SECRET=super-secret-change-me-in-production
  RESEND_API_KEY=
  R2_ACCOUNT_ID=
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  R2_BUCKET_NAME=element-ems-docs
  R2_PUBLIC_URL=
  NEXT_PUBLIC_APP_URL=http://localhost:3000

Create a CLAUDE.md file at the root with:
  - Stack summary (Next.js App Router, Prisma, Neon PostgreSQL, Cloudflare R2, Resend)
  - Folder structure explanation
  - Key conventions:
      * All API routes live in app/api/ as Next.js Route Handlers (not Express)
      * Use Prisma client from lib/db.ts for all DB access
      * Auth: JWT in httpOnly cookie named "ems_token", verified via lib/auth.ts
      * File uploads go to Cloudflare R2 via lib/r2.ts (never local disk)
      * Email sent via Resend via lib/email.ts
      * All API routes export named functions: GET, POST, PUT, DELETE
      * TypeScript everywhere, no any types
      * Zod for all input validation in API routes

Initialize git, create a .gitignore that excludes .env.local and node_modules.
```

---

### PROMPT 2 — Prisma Schema (Full Data Model)

```
Set up Prisma with Neon PostgreSQL and define the full data model.

1. Install Prisma:
   npm install prisma @prisma/client
   npx prisma init

2. In prisma/schema.prisma, set the provider to "postgresql" and use the DATABASE_URL env var.
   Add: previewFeatures = ["driverAdapters"] to support Neon's serverless driver.

3. Create lib/db.ts using the Neon serverless adapter for Prisma:
   - Install: npm install @neondatabase/serverless @prisma/adapter-neon
   - Use a singleton pattern to avoid exhausting connections in serverless (Vercel functions)
   - Export a single `prisma` client instance

4. Define these models in schema.prisma:

Department
  id (cuid), name, headId (optional FK to Employee), parentId (optional self-relation), createdAt

Employee
  id (cuid), name, email (unique), phone, grade, status (ACTIVE/INACTIVE/ON_LEAVE)
  joinDate, avatarUrl (optional), departmentId (FK), managerId (optional FK to self)
  createdAt, updatedAt

User  ← authentication record, linked 1:1 to Employee
  id (cuid), employeeId (unique FK), passwordHash
  role: enum (SUPER_ADMIN, HR_ADMIN, DEPT_HEAD, TEAM_LEAD, EMPLOYEE, VIEWER)
  lastLogin (optional), createdAt

LeavePolicy
  id (cuid), grade, leaveType: enum (CASUAL, EARNED, SICK, MATERNITY, PATERNITY, COMP_OFF, LWP)
  daysAllowed (Int), carryForward (Boolean), createdAt
  @@unique([grade, leaveType])

LeaveBalance
  id (cuid), employeeId (FK), leaveType, year (Int), totalDays (Int), usedDays (Int), createdAt

LeaveRequest
  id (cuid), employeeId (FK), leaveType, startDate, endDate, reason
  status: enum (PENDING, APPROVED, REJECTED, CANCELLED)
  approvedById (optional FK to Employee), approverComment (optional), appliedAt, resolvedAt (optional)

Attendance
  id (cuid), employeeId (FK), date, checkIn (optional DateTime), checkOut (optional DateTime)
  status: enum (PRESENT, ABSENT, LATE, HALF_DAY, HOLIDAY, WEEKEND)
  overtimeMinutes (Int default 0), note (optional), createdAt
  @@unique([employeeId, date])

PerformanceReview
  id (cuid), employeeId (FK), reviewerId (FK to Employee)
  cycle (String, e.g. "Annual-2025"), status: enum (DRAFT, SUBMITTED, CALIBRATED, CLOSED)
  rating (Float optional), goalsJson (Json), selfFeedback (optional), feedback (optional)
  createdAt, updatedAt

Document
  id (cuid), employeeId (FK), fileName, fileType, r2Key (the R2 object key/path), documentType
  uploadedById (FK to User), createdAt

Notification
  id (cuid), userId (FK to User), type, title, message, isRead (Boolean default false), createdAt

AuditLog
  id (cuid), userId (FK to User), action: enum (CREATE, UPDATE, DELETE)
  entity, entityId, oldValue (Json optional), newValue (Json optional), createdAt

Holiday
  id (cuid), name, date, isNational (Boolean), createdAt

5. Run the migration:
   npx prisma migrate dev --name init

6. Run:
   npx prisma generate
```

---

### PROMPT 3 — Auth System (JWT + bcrypt)

```
Implement the complete authentication system using Next.js API Route Handlers.

1. Install dependencies:
   npm install bcryptjs jsonwebtoken
   npm install -D @types/bcryptjs @types/jsonwebtoken

2. Create lib/auth.ts:
   - signJwt({ userId, role, employeeId }): signs a JWT using JWT_SECRET, 7-day expiry
   - verifyJwt(token: string): verifies and returns the payload or null
   - getSession(request: Request): reads "ems_token" cookie from request headers, verifies it, returns session payload or null
   - requireSession(request: Request): same as getSession but throws a 401 Response if missing
   - requireRole(request: Request, ...roles: Role[]): throws 403 if session role not in allowed list

3. Create lib/password.ts:
   - hashPassword(plain: string): bcrypt hash with 12 rounds
   - comparePassword(plain: string, hash: string): bcrypt compare

4. Create app/api/auth/login/route.ts (POST):
   - Parse JSON body: { email, password }
   - Find Employee by email, include User relation
   - If not found or no User record: return 401 with generic message "Invalid credentials"
   - Compare password with bcrypt
   - On success: sign JWT, set httpOnly cookie:
       name: "ems_token"
       value: signed JWT
       httpOnly: true
       secure: true (always — Vercel is always HTTPS)
       sameSite: "lax"
       path: "/"
       maxAge: 60 * 60 * 24 * 7 (7 days)
   - Return: { employee: { id, name, email, role } }
   - Update lastLogin on the User record

5. Create app/api/auth/logout/route.ts (POST):
   - Clear the "ems_token" cookie (set maxAge to 0)
   - Return: { success: true }

6. Create app/api/auth/me/route.ts (GET):
   - Call requireSession(request)
   - Fetch employee from DB including department name
   - Return: { id, name, email, role, department, avatarUrl }

7. Create a seed script at prisma/seed.ts:
   - Creates one Super Admin: email admin@element.gov.in, password Admin@1234
   - Creates 3 departments: Administration, Field Operations, Technical
   - Creates 5 sample employees (at least one in each department)
   - Assign one employee as Department Head for each department
   - Use upsert so running the seed twice is safe

   Add to package.json:
     "prisma": { "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts" }

   Run: npx prisma db seed
```

---

### PROMPT 4 — RBAC & Auth Helpers

```
Build the role-based access control system used across all API routes.

1. Create lib/permissions.ts:
   - Define the Role enum order: SUPER_ADMIN > HR_ADMIN > DEPT_HEAD > TEAM_LEAD > EMPLOYEE > VIEWER
   - Export a hasRole(userRole: Role, ...allowedRoles: Role[]): boolean helper
   - Export a roleRank object mapping each role to a number (SUPER_ADMIN=6, down to VIEWER=1)
   - Export isAtLeast(userRole: Role, minimumRole: Role): boolean — true if userRole >= minimumRole

2. Update lib/auth.ts to add:
   - requireMinRole(request: Request, minimumRole: Role): throws 403 if session role is below minimum
   - This is the primary guard used in API routes

3. Create a typed helper in lib/api-response.ts:
   - ok(data: unknown, status = 200): returns NextResponse.json({ data }, { status })
   - err(message: string, status = 400): returns NextResponse.json({ error: message }, { status })
   - These keep all API responses consistent

4. Update all existing API routes (auth/login, auth/logout, auth/me) to use ok() and err() helpers.

5. Create lib/validate.ts:
   - Install: npm install zod
   - Export parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T>
     - Parses JSON body, validates against schema
     - If invalid: throws a 400 Response with zod error details formatted as { error, fields }
   - Export parseQuery(request: Request): URLSearchParams — helper to read query params cleanly

6. Write a short comment block at the top of lib/permissions.ts explaining:
   - How to add new role checks
   - Why we use isAtLeast() for most guards (hierarchy-aware)
   - When to use hasRole() instead (when non-hierarchical access is needed)
```

---

### PROMPT 5 — Employee CRUD API

```
Build the full Employee API using Next.js Route Handlers in app/api/employees/.

File structure:
  app/api/employees/route.ts         → GET (list), POST (create)
  app/api/employees/[id]/route.ts    → GET (one), PUT (update), DELETE (soft delete)
  app/api/employees/import/route.ts  → POST (CSV bulk import)
  app/api/employees/export/route.ts  → GET (CSV export)

Install: npm install csv-parse csv-stringify

Implement:

GET /api/employees
  - requireSession
  - Query params: search (name/email), departmentId, status, grade, page (default 1), limit (default 20)
  - EMPLOYEE role: can only see employees in their own department
  - Return: { employees: [...], total, page, totalPages }
  - Each employee includes: id, name, email, phone, grade, status, department.name, manager.name, avatarUrl, joinDate

GET /api/employees/:id
  - requireSession
  - EMPLOYEE: can only fetch own record; others require TEAM_LEAD or above
  - Return full profile: employee fields + department + manager + leaveBalances (current year) + recentAttendance (last 7 days)

POST /api/employees
  - requireMinRole(HR_ADMIN)
  - Body schema (zod): name, email, phone, grade, departmentId, managerId?, joinDate, initialPassword
  - Run in Prisma transaction:
      1. Create Employee
      2. Create User (hash initialPassword with bcrypt)
      3. Find LeavePolicy for this grade; create LeaveBalance records for all leave types for current year
  - Write to AuditLog: action=CREATE, entity="Employee"
  - Return created employee

PUT /api/employees/:id
  - requireSession
  - If EMPLOYEE role: can only update own record, and only fields: phone, avatarUrl
  - If HR_ADMIN or above: can update all fields
  - Write to AuditLog: action=UPDATE, entity="Employee", oldValue + newValue snapshots

DELETE /api/employees/:id  (soft delete)
  - requireMinRole(SUPER_ADMIN)
  - Set employee.status = INACTIVE — do NOT delete the record
  - Write to AuditLog

POST /api/employees/import
  - requireMinRole(HR_ADMIN)
  - Accept multipart/form-data with a CSV file field named "file"
  - Parse CSV rows; expected columns: name, email, phone, grade, departmentName, joinDate, initialPassword
  - For each row: create Employee + User + LeaveBalances (same logic as POST /employees)
  - Skip rows where email already exists
  - Return: { created: N, skipped: N, errors: [{ row, reason }] }

GET /api/employees/export
  - requireMinRole(HR_ADMIN)
  - Query all active employees with department name
  - Return a CSV file download (Content-Disposition: attachment; filename="employees.csv")

Use zod for all POST/PUT body validation. Use lib/api-response.ts helpers for all responses.
```

---

### PROMPT 6 — Department API + Employee Transfer

```
Build the Department API and employee transfer endpoint.

Files:
  app/api/departments/route.ts         → GET (list), POST (create)
  app/api/departments/[id]/route.ts    → GET (one), PUT (update), DELETE
  app/api/employees/[id]/transfer/route.ts → POST (transfer employee)

Implement:

GET /api/departments
  - requireSession
  - Return all departments with: id, name, headEmployee.name, _count.employees, parent.name

GET /api/departments/:id
  - requireSession
  - Return department + its employees (id, name, grade, status) + subdepartments list

POST /api/departments
  - requireMinRole(HR_ADMIN)
  - Body: { name, headId?, parentId? }
  - Validate name is non-empty and unique

PUT /api/departments/:id
  - requireMinRole(HR_ADMIN)
  - Can update: name, headId, parentId

DELETE /api/departments/:id
  - requireMinRole(SUPER_ADMIN)
  - Check: reject if department has any active employees (return 400 with count)
  - Delete department record

POST /api/employees/:id/transfer
  - requireMinRole(HR_ADMIN)
  - Body: { newDepartmentId, newManagerId? }
  - Update employee.departmentId (and managerId if provided)
  - Write to AuditLog: entity="Employee", action=UPDATE
    oldValue: { departmentId: oldDeptId }
    newValue: { departmentId: newDeptId }
  - Return updated employee

All responses use lib/api-response.ts helpers. All POST/PUT inputs validated with zod.
```

---

### PROMPT 7 — Frontend: Auth + App Shell

```
Build the full frontend foundation using Next.js App Router with React and Tailwind CSS.

1. Install dependencies:
   npm install @tanstack/react-query @tanstack/react-query-devtools
   npm install react-hot-toast
   npm install lucide-react

2. Create app/layout.tsx (root layout):
   - Wrap with a QueryClientProvider (create lib/query-client.ts with a singleton QueryClient)
   - Wrap with a Toaster from react-hot-toast
   - Set <html lang="en"> and default metadata (title: "ELEMENT EMS")

3. Create app/(auth)/login/page.tsx:
   - Centered card layout, full-screen green gradient background
   - Logo text: "ELEMENT" in bold, "Nagaland" lighter weight below
   - Tagline: "Employee Management System"
   - Email + password inputs with labels
   - Submit button with loading spinner state
   - On submit: POST to /api/auth/login, on success redirect to /dashboard, on error show inline error message
   - Use react-hot-toast for success/error feedback

4. Create a useAuth hook at hooks/useAuth.ts:
   - Fetches GET /api/auth/me with TanStack Query (queryKey: ['auth', 'me'])
   - Returns: { employee, role, isLoading, isAuthenticated }
   - Used by all protected pages to get current user

5. Create app/(dashboard)/layout.tsx (protected shell):
   - On mount: if not authenticated (no session / 401 from /api/auth/me), redirect to /login
   - Left sidebar: 260px wide, dark green (#1B4332), white text
     → Logo at top: "ELEMENT EMS"
     → Nav links (with Lucide icons): Dashboard, Employees, Leave, Attendance, Performance, Reports, Settings
     → Settings link: only show for HR_ADMIN and above
     → Active link: highlighted with accent green (#52B788) background
   - Top bar: white, shadow, shows logged-in user name + avatar initial + logout button
   - Main content area: background #F8FAF9, padding, scrollable
   - On mobile (< 768px): sidebar hidden behind hamburger button

6. Design tokens — add to tailwind.config.ts:
   colors:
     primary: { DEFAULT: '#2D6A4F', dark: '#1B4332', light: '#52B788' }
     surface: '#F8FAF9'
     ink: '#1B2E27'

7. Create app/(dashboard)/dashboard/page.tsx as an empty placeholder with heading "Dashboard — coming soon" so the route works immediately.

8. Create a ProtectedPage wrapper component at components/ProtectedPage.tsx:
   - Accepts a minimumRole prop
   - Uses useAuth; if role is below minimumRole, shows a "Access Denied" message
   - Shows a loading skeleton while auth is loading
   - Wrap every dashboard page with this
```

---

### PROMPT 8 — Dashboard Page + Stats API

```
Build the Dashboard page and its backend stats endpoint.

Backend — app/api/dashboard/stats/route.ts (GET):
  - requireSession
  - For HR_ADMIN and above, return:
      totalEmployees: count of active employees
      onLeaveToday: count of employees with approved LeaveRequest covering today
      presentToday: count of distinct employees with Attendance.checkIn today
      pendingLeaveRequests: count of PENDING leave requests the current user should action
        (TEAM_LEAD: from direct reports; HR_ADMIN+: all pending)
      headcountByDepartment: [{ departmentName, count }]
      leaveByType: [{ leaveType, count }] for current month approved leaves
      attendanceTrend: [{ date, present }] for last 30 days
      recentActivity: last 10 AuditLog entries with actor.employee.name, action, entity, createdAt
  - For EMPLOYEE role, return only their personal stats:
      myLeaveBalance: their current-year LeaveBalance records
      myAttendanceThisMonth: their attendance summary for current month
      myPendingLeave: count of their own PENDING requests

Frontend — app/(dashboard)/dashboard/page.tsx:
  - Wrap with ProtectedPage (no minimum role — all authenticated users can see dashboard)
  - Use TanStack Query to fetch /api/dashboard/stats

  KPI cards row (4 cards, responsive grid):
    - Total Employees | On Leave Today | Present Today | Pending Approvals
    - Each card: large number, label, subtle icon, green left border accent

  Charts row (use Recharts — install: npm install recharts):
    - Bar chart: Headcount by Department
    - Donut chart: Leave Type Distribution this month
    - Line chart: Attendance trend last 30 days

  Bottom row:
    - Recent Activity feed (left, 60% width): actor, action description, time-ago
    - Quick Actions (right, 40% width): role-based action buttons

  Loading state: show skeleton cards (grey pulsing rectangles) while fetching
  Error state: show a friendly error card with retry button

  Make fully responsive: 4-col → 2-col → 1-col as screen shrinks
```

---

## PHASE 2 — Leave & Attendance (Weeks 5–8)

---

### PROMPT 9 — Leave Policy & Balance API

```
Build the leave policy and balance management API routes.

Files:
  app/api/leave/policies/route.ts               → GET, POST
  app/api/leave/balance/me/route.ts             → GET (own balances)
  app/api/leave/balance/[employeeId]/route.ts   → GET (any employee, HR_ADMIN+)
  app/api/leave/balance/initialize/route.ts     → POST (bulk initialize)
  app/api/leave/holidays/route.ts               → GET, POST

Implement:

GET /api/leave/policies
  - requireMinRole(HR_ADMIN)
  - Return all LeavePolicies grouped by grade: { [grade]: { [leaveType]: { daysAllowed, carryForward } } }

POST /api/leave/policies
  - requireMinRole(HR_ADMIN)
  - Body: { grade, leaveType, daysAllowed, carryForward }
  - Upsert by [grade, leaveType] unique constraint

GET /api/leave/balance/me
  - requireSession
  - Return current year's LeaveBalance records for the logged-in employee
  - Include: leaveType, totalDays, usedDays, remainingDays (computed: totalDays - usedDays)

GET /api/leave/balance/:employeeId
  - requireSession
  - EMPLOYEE: return 403 if employeeId != their own employeeId
  - TEAM_LEAD+: can access any employee
  - Return same format as /balance/me

POST /api/leave/balance/initialize
  - requireMinRole(HR_ADMIN)
  - Body: { year: number }
  - Fetch all active employees
  - For each employee: look up their grade's LeavePolicies; create LeaveBalance rows for each leave type for that year
  - Skip employees who already have balances for that year
  - Return: { initialized: N, skipped: N }

GET /api/leave/holidays
  - requireSession
  - Return all holidays for current year sorted by date

POST /api/leave/holidays
  - requireMinRole(HR_ADMIN)
  - Body: { name, date, isNational }
  - Validate date is a valid ISO date string

DELETE /api/leave/holidays/:id
  - requireMinRole(HR_ADMIN)
  - Only allow if holiday is in the future

All inputs validated with zod. All responses use lib/api-response.ts helpers.
```

---

### PROMPT 10 — Leave Request Workflow API

```
Build the leave request workflow endpoints.

Files:
  app/api/leave/requests/route.ts                    → GET (list), POST (apply)
  app/api/leave/requests/[id]/approve/route.ts       → PUT
  app/api/leave/requests/[id]/reject/route.ts        → PUT
  app/api/leave/requests/[id]/cancel/route.ts        → PUT
  app/api/leave/calendar/route.ts                    → GET

Implement:

GET /api/leave/requests
  - requireSession
  - Query params: status, employeeId, startDate, endDate, leaveType, page, limit
  - Scope by role:
    EMPLOYEE: only their own requests
    TEAM_LEAD: their direct reports + their own
    DEPT_HEAD: their department's employees
    HR_ADMIN+: all requests
  - Return paginated list with employee name + department name included

POST /api/leave/requests  (apply for leave)
  - requireSession (any authenticated employee can apply)
  - Body: { leaveType, startDate, endDate, reason }
  - Validation:
    - startDate >= today
    - endDate >= startDate
  - Business logic:
    - Fetch holidays between startDate and endDate
    - Count working days (exclude Saturdays, Sundays, and holidays)
    - Check LeaveBalance: if usedDays + workingDays > totalDays, return 400 with { error, balance }
  - Create LeaveRequest with status PENDING
  - Create a Notification for the employee's direct manager (managerId)
    title: "New leave request from [name]"
    message: "[name] has applied for [N] day(s) of [leaveType] leave"
  - Return created request

PUT /api/leave/requests/:id/approve
  - requireMinRole(TEAM_LEAD)
  - Fetch the request; verify approver has scope (TEAM_LEAD: direct reports only; HR_ADMIN+: all)
  - Check request is PENDING; else return 400
  - Update: status=APPROVED, approvedById, resolvedAt=now()
  - Increment LeaveBalance.usedDays by the working day count
  - Create Notification for the employee
  - Write to AuditLog

PUT /api/leave/requests/:id/reject
  - requireMinRole(TEAM_LEAD)
  - Body: { comment } (required)
  - Check request is PENDING
  - Update: status=REJECTED, approvedById, approverComment, resolvedAt=now()
  - Do NOT touch LeaveBalance
  - Create Notification for employee

PUT /api/leave/requests/:id/cancel
  - requireSession
  - EMPLOYEE: can cancel own PENDING requests only
  - HR_ADMIN+: can cancel any PENDING request
  - If request was APPROVED: restore LeaveBalance.usedDays
  - Set status=CANCELLED

GET /api/leave/calendar
  - requireSession
  - Query params: month (1-12), year, departmentId (optional)
  - Return all APPROVED leave requests that overlap the given month
  - Include employee name, department name, leaveType, startDate, endDate
  - Also return the holiday list for that month

Create a shared helper function lib/leave-utils.ts:
  - countWorkingDays(startDate, endDate, holidays: Date[]): number
    Counts Mon-Fri days in range excluding the holiday list
```

---

### PROMPT 11 — Attendance API

```
Build the attendance tracking API.

Files:
  app/api/attendance/check-in/route.ts      → POST
  app/api/attendance/check-out/route.ts     → POST
  app/api/attendance/today/route.ts         → GET
  app/api/attendance/my/route.ts            → GET (own monthly)
  app/api/attendance/[id]/route.ts          → GET (any employee, manager+)
  app/api/attendance/report/route.ts        → GET (HR report)
  app/api/attendance/manual/route.ts        → POST (HR manual entry)
  app/api/attendance/team/route.ts          → GET (today's team status)

Implement:

POST /api/attendance/check-in
  - requireSession
  - Check no existing Attendance record for today + this employee (unique constraint)
  - Determine status: LATE if current time > 09:30, else PRESENT
  - Create Attendance { employeeId, date: today, checkIn: now(), status }
  - Return the record

POST /api/attendance/check-out
  - requireSession
  - Find today's Attendance record for this employee; return 400 if none
  - Return 400 if already checked out
  - Compute overtimeMinutes: if checkout > 18:30, minutes after 18:30
  - Update record: checkOut=now(), overtimeMinutes
  - Return updated record

GET /api/attendance/today
  - requireSession
  - Return today's Attendance record or null

GET /api/attendance/my
  - requireSession
  - Query params: month (1-12), year
  - Return all Attendance records for the employee in that month
  - Also return summary: { present, absent, late, halfDay, totalOvertime }
  - Fill in dates with no record as ABSENT (compute absent count from working days)

GET /api/attendance/:employeeId
  - requireMinRole(TEAM_LEAD)
  - Query params: month, year (or startDate, endDate)
  - Return attendance records + summary for any employee

GET /api/attendance/report
  - requireMinRole(HR_ADMIN)
  - Query params: departmentId (optional), startDate, endDate, format (json|csv)
  - Return one row per employee: name, department, present, absent, late, attendancePct, totalOvertime
  - If format=csv: return downloadable CSV

POST /api/attendance/manual
  - requireMinRole(HR_ADMIN)
  - Body: { employeeId, date, checkIn?, checkOut?, status, note }
  - Upsert the Attendance record for that employee+date
  - Write to AuditLog with reason

GET /api/attendance/team
  - requireMinRole(TEAM_LEAD)
  - Return today's attendance status for all the current user's direct reports
  - Include: employee name, status, checkIn time or null
```

---

### PROMPT 12 — Frontend: Leave Module UI

```
Build the full Leave Management UI pages and components.

Install: npm install react-day-picker date-fns

Files to create:
  components/leave/LeaveBalanceWidget.tsx
  app/(dashboard)/leaves/page.tsx
  app/(dashboard)/leaves/apply/page.tsx
  app/(dashboard)/leaves/calendar/page.tsx

1. LeaveBalanceWidget (components/leave/LeaveBalanceWidget.tsx)
   - Fetches GET /api/leave/balance/me
   - Shows one row per leave type: label, "X / Y days used" text, coloured progress bar
   - Colour: green if < 75% used, amber if >= 75%, red if >= 100%
   - Used on both the Leave page and the Employee Profile page

2. Leave List & Actions (app/(dashboard)/leaves/page.tsx)
   - Wrap with ProtectedPage (no minimum role)
   - Tabs: "My Requests" (all roles) | "Team Requests" (TEAM_LEAD+)
   
   My Requests tab:
   - Table: Type | From | To | Days | Applied On | Status badge | Actions (Cancel if PENDING)
   - Status badges: yellow pill=Pending, green=Approved, red=Rejected, grey=Cancelled
   - "Apply for Leave" button → navigate to /leaves/apply
   
   Team Requests tab (TEAM_LEAD+):
   - Same table but shows Employee Name column
   - Approve / Reject buttons in Actions column
   - Clicking Approve: confirm modal, then PUT .../approve
   - Clicking Reject: modal with required comment textarea, then PUT .../reject
   - Filter bar: status dropdown, date range pickers, leave type dropdown

3. Leave Application Form (app/(dashboard)/leaves/apply/page.tsx)
   - "Apply for Leave" heading with back button
   - Form fields:
     → Leave Type: dropdown (shows remaining balance in parentheses for each type)
     → Start Date / End Date: date pickers (disallow past dates, disallow weekends)
     → Working Days: auto-computed count shown below date pickers (calls countWorkingDays locally)
     → Reason: textarea (required)
   - Submit button (loading state while POST is in flight)
   - On success: toast + redirect to /leaves

4. Leave Calendar (app/(dashboard)/leaves/calendar/page.tsx)
   - Requires TEAM_LEAD or above
   - Month/year navigation (prev/next arrows)
   - Department filter dropdown
   - Calendar grid (7-col, Mon–Sun)
   - For each day: show coloured employee name bars for approved leaves (one bar per employee)
   - Holidays shown as light red background with holiday name tooltip
   - Employee-specific colour assigned consistently per employee

Use TanStack Query for all fetching. react-hot-toast for action feedback.
```

---

### PROMPT 13 — Frontend: Attendance UI

```
Build the Attendance module UI.

Files:
  app/(dashboard)/attendance/page.tsx
  components/attendance/CheckInOutCard.tsx
  components/attendance/AttendanceCalendar.tsx

1. CheckInOutCard (components/attendance/CheckInOutCard.tsx)
   - Fetches GET /api/attendance/today
   - If not checked in: shows "Check In" button (green, large)
   - If checked in but not out: shows check-in time + "Check Out" button (amber)
   - If both done: shows check-in time, check-out time, total hours, OVERTIME badge if applicable
   - LATE badge if status === LATE
   - Buttons POST to respective endpoints with loading state and toast feedback

2. AttendanceCalendar (components/attendance/AttendanceCalendar.tsx)
   - Accepts: employeeId (optional, for manager view), month, year
   - Fetches GET /api/attendance/my or /api/attendance/:employeeId
   - Renders a grid of days in the month
   - Each day cell coloured: green=PRESENT, red=ABSENT, yellow=LATE, grey=WEEKEND, light red=HOLIDAY
   - Shows check-in time as small text in cell
   - Summary row below: Present N | Absent N | Late N | Overtime Nh

3. Attendance Page (app/(dashboard)/attendance/page.tsx)
   - Wrap with ProtectedPage

   For EMPLOYEE role:
   - CheckInOutCard at top
   - Month/year selector (defaults to current month)
   - AttendanceCalendar for own attendance
   - Summary stats cards below calendar

   For TEAM_LEAD / DEPT_HEAD / HR_ADMIN:
   - "Team Today" section at top:
     → List of direct reports (or all employees for HR) with today's status chip
     → Chips: green=Present, yellow=Late, red=Absent, grey=Not yet
   - Tabs: "My Attendance" | "Team Attendance"
   - Team Attendance tab: employee search + month picker → shows that employee's AttendanceCalendar
   - "Download Report" button (HR_ADMIN+): calls GET /api/attendance/report?format=csv

All TanStack Query. Loading skeletons while fetching.
```

---

## PHASE 3 — Performance & Documents (Weeks 9–12)

---

### PROMPT 14 — Performance Review API

```
Build the Performance Review API.

Files:
  app/api/performance/reviews/route.ts                         → GET (list), POST (initiate cycle)
  app/api/performance/reviews/[id]/route.ts                    → GET (one review)
  app/api/performance/reviews/[id]/self-assessment/route.ts    → PUT
  app/api/performance/reviews/[id]/manager-review/route.ts     → PUT
  app/api/performance/reviews/[id]/calibrate/route.ts          → PUT
  app/api/performance/reviews/[id]/close/route.ts              → PUT

Implement:

GET /api/performance/reviews
  - requireSession
  - Query params: cycle, status, employeeId, page, limit
  - EMPLOYEE: only their own reviews
  - TEAM_LEAD / DEPT_HEAD: their direct reports' reviews + their own
  - HR_ADMIN+: all reviews
  - Return: review list with employeeName, reviewerName, cycle, status, rating, createdAt

POST /api/performance/reviews  (initiate a cycle — HR only)
  - requireMinRole(HR_ADMIN)
  - Body: { pairs: [{ employeeId, reviewerId }], cycle, dueDate }
  - Create PerformanceReview records for each pair with status DRAFT, empty goalsJson
  - Notify each employee and reviewer

GET /api/performance/reviews/:id
  - requireSession
  - Return full review: employee, reviewer, cycle, status, goalsJson, selfFeedback, feedback, rating
  - EMPLOYEE: can only see own reviews (return 403 otherwise)

PUT /api/performance/reviews/:id/self-assessment
  - requireSession
  - Validate: session.employeeId === review.employeeId
  - Validate: review.status === DRAFT
  - Body: { goalsJson (self-rated), selfFeedback }
  - Merge into existing goalsJson (don't overwrite reviewer data)
  - Write to AuditLog

PUT /api/performance/reviews/:id/manager-review
  - requireSession
  - Validate: session.employeeId === review.reviewerId
  - Body: { rating (1–5), goalsJson (manager ratings per goal), feedback }
  - Update status to SUBMITTED
  - Create Notification for HR: "Review submitted for [employee name]"
  - Write to AuditLog

PUT /api/performance/reviews/:id/calibrate
  - requireMinRole(HR_ADMIN)
  - Body: { rating (optional override), notes }
  - Update status to CALIBRATED
  - Write to AuditLog

PUT /api/performance/reviews/:id/close
  - requireMinRole(HR_ADMIN)
  - Update status to CLOSED
  - Create Notification for employee: "Your performance review for [cycle] has been completed"
  - Write to AuditLog

All inputs validated with zod.
```

---

### PROMPT 15 — Document Management API (Cloudflare R2)

```
Build the Document Management API using Cloudflare R2 for file storage.

1. Create lib/r2.ts:
   Install: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   
   - Create an S3Client configured for Cloudflare R2:
       endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
       region: "auto"
       credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
   
   - Export uploadToR2(key: string, body: Buffer, contentType: string): uploads object
   - Export deleteFromR2(key: string): deletes object
   - Export getR2SignedUrl(key: string, expiresIn = 3600): generates a presigned GET URL
   - Key naming convention: `employees/{employeeId}/{timestamp}-{sanitizedFilename}`

2. API routes:
   app/api/documents/employee/[employeeId]/route.ts  → GET (list docs)
   app/api/documents/upload/[employeeId]/route.ts    → POST (upload)
   app/api/documents/[id]/download/route.ts          → GET (get signed download URL)
   app/api/documents/[id]/route.ts                   → DELETE
   app/api/documents/generate-letter/route.ts        → POST

GET /api/documents/employee/:employeeId
  - requireSession
  - EMPLOYEE: only own docs; HR_ADMIN+: any employee
  - Return list: id, fileName, documentType, fileType, createdAt, uploadedBy.name

POST /api/documents/upload/:employeeId
  - requireSession (EMPLOYEE can upload own; HR_ADMIN+ can upload for anyone)
  - Parse multipart/form-data: file + documentType fields
  - Validate: max 10MB, allowed MIME types: application/pdf, image/jpeg, image/png, image/gif,
    application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - Sanitize filename: strip path chars, replace spaces with underscores
  - Upload to R2 with key: employees/{employeeId}/{Date.now()}-{sanitizedName}
  - Create Document record in DB with r2Key
  - Return document metadata

GET /api/documents/:id/download
  - requireSession; enforce ownership
  - Fetch Document record; get r2Key
  - Generate a presigned URL (1 hour expiry) using getR2SignedUrl
  - Return: { url } — frontend opens this URL in new tab for download

DELETE /api/documents/:id
  - requireMinRole(HR_ADMIN)
  - Delete from R2 using deleteFromR2
  - Delete Document record from DB
  - Write to AuditLog

POST /api/documents/generate-letter
  - requireMinRole(HR_ADMIN)
  - Body: { employeeId, letterType: "OFFER_LETTER" | "EXPERIENCE_LETTER" | "SALARY_SLIP" }
  - Fetch employee with department
  - Generate HTML from template
  - Return: { html } — frontend opens a print dialog

3. Create letter templates in lib/letter-templates/:
   - offerLetter.ts: function offerLetter(employee): string → returns full HTML document
   - experienceLetter.ts: similar
   - salarySlip.ts: similar
   Each template uses the Element Nagaland green theme and includes employee name,
   designation, department, join date, and today's date.

4. Note in CLAUDE.md: files are stored in Cloudflare R2, never on local disk.
   The r2Key in the Document table is the lookup key. Never store public URLs in the DB
   (they expire); always generate fresh presigned URLs on demand.
```

---

### PROMPT 16 — Reporting API

```
Build the Reports API.

Files:
  app/api/reports/headcount/route.ts
  app/api/reports/leave-utilization/route.ts
  app/api/reports/attendance-summary/route.ts
  app/api/reports/attrition/route.ts
  app/api/reports/custom/route.ts

Create lib/to-csv.ts:
  - Export toCsv(rows: Record<string, unknown>[], headers?: string[]): string
  - First row is headers (either provided or derived from first object's keys)
  - Escape commas and quotes in values

All routes require requireMinRole(HR_ADMIN).
All routes accept query param format=json (default) or format=csv.
When format=csv: set Content-Disposition: attachment; filename="report-[type]-[date].csv"

Implement:

GET /api/reports/headcount
  - Query params: departmentId (optional), joinedAfter, joinedBefore
  - Returns: total active employees, breakdown by department (name, count), breakdown by grade

GET /api/reports/leave-utilization
  - Query params: year (default current year), departmentId (optional)
  - Returns: per leave type → { leaveType, totalAllowed, totalUsed, utilizationPct }

GET /api/reports/attendance-summary
  - Query params: month, year, departmentId (optional)
  - Returns one row per employee: name, department, presentDays, absentDays, lateDays, attendancePct, overtimeHours

GET /api/reports/attrition
  - Query params: startDate, endDate, departmentId (optional)
  - Returns: employees who became INACTIVE in the period, grouped by department
  - Include: name, department, grade, joinDate, deactivatedAt (last updatedAt)

GET /api/reports/custom
  - Query params: entity (employee|leave|attendance), departmentId, grade, status, dateFrom, dateTo, page, limit
  - For entity=employee: query Employee with filters
  - For entity=leave: query LeaveRequest with filters
  - For entity=attendance: query Attendance with filters
  - Return flat array of rows (flattened relation names for CSV friendliness)
```

---

### PROMPT 17 — Frontend: Employee Directory & Profile Pages

```
Build the Employee Directory and Profile pages.

Files:
  app/(dashboard)/employees/page.tsx
  app/(dashboard)/employees/[id]/page.tsx
  components/employees/EmployeeCard.tsx
  components/employees/AddEmployeeModal.tsx

1. Employee Directory (app/(dashboard)/employees/page.tsx)
   - Wrap with ProtectedPage (minimum: TEAM_LEAD; EMPLOYEE gets redirect to own profile)
   - Top bar: search input + filters (Department dropdown, Status, Grade) + View Toggle (grid/list)
   - "Add Employee" button (HR_ADMIN+) → opens AddEmployeeModal
   - "Export CSV" button (HR_ADMIN+) → GET /api/employees/export download
   - Grid view: EmployeeCard components in responsive grid (4-col → 2-col → 1-col)
   - List view: table with same fields
   - Each EmployeeCard: avatar circle (initials if no photo), name, grade, department, status badge, email
   - Click card → navigate to /employees/:id
   - Pagination: 20 per page with prev/next buttons

2. AddEmployeeModal (components/employees/AddEmployeeModal.tsx)
   - Fields: Full Name, Email, Phone, Grade, Department (dropdown), Manager (dropdown, filtered by dept), Join Date, Initial Password
   - All required except Manager
   - Inline zod validation (show error below each field)
   - Submit → POST /api/employees
   - On success: close modal, refetch directory list, toast "Employee added"
   - On error: show server error message

3. Employee Profile (app/(dashboard)/employees/[id]/page.tsx)
   - Fetch GET /api/employees/:id
   - Header section: avatar (large circle with initials), name (h1), grade badge, status badge, department, manager name, join date
   - "Edit" button (own record or HR_ADMIN+) → inline editing mode for allowed fields
   - 5 Tabs:

   Tab 1 — Info
     Personal info: email, phone
     Emergency contact (editable for own record)
     Org: department, manager, grade

   Tab 2 — Leave
     LeaveBalanceWidget at top
     Table of their leave requests: type, dates, days, status, approver

   Tab 3 — Attendance
     Month picker + AttendanceCalendar component (reuse from Prompt 13)
     Summary stats row

   Tab 4 — Performance
     List of PerformanceReview records: cycle, reviewer, status, rating (if closed)
     Click → view full review detail (goals table + feedback)

   Tab 5 — Documents
     List: fileName, type, uploaded date, Download button
     "Upload Document" button (HR_ADMIN+ or own) → file picker + document type input → POST
     "Generate Letter" dropdown (HR_ADMIN+): Offer Letter / Experience Letter / Salary Slip
       → calls POST /api/documents/generate-letter → opens HTML in a new tab for printing

Loading skeletons for all tabs. Error states handled.
```

---

### PROMPT 18 — Frontend: Performance & Reports UI

```
Build the Performance, Reports, and Settings pages.

1. Performance Page (app/(dashboard)/performance/page.tsx)
   - ProtectedPage (all roles)
   
   EMPLOYEE view:
   - "My Reviews" section: list of reviews as cards (cycle name, status badge, rating stars if CLOSED)
   - Click a review card → expand to show:
     Goals table: goal name | my self-rating | manager rating | comments
     Manager feedback block
   - If review is DRAFT: show "Submit Self-Assessment" button → opens inline form
     Self-assessment form: for each goal in goalsJson, a rating input + comment textarea
     Submit → PUT .../self-assessment

   TEAM_LEAD / HR_ADMIN view:
   - Tabs: "My Reviews" (same as above) | "Team Reviews"
   - Team Reviews: grouped by cycle → list of employee cards with status chip
   - Click employee card → full review form: goal ratings (1–5) + feedback textarea + Submit button
   - Submit → PUT .../manager-review

   HR_ADMIN extra tab: "Manage Cycles"
   - "Initiate New Cycle" button → modal:
     Cycle name input, Due date picker
     Table of employee→reviewer pairs (add/remove rows)
     Employee and Reviewer dropdowns populated from /api/employees
   - Submit → POST /api/performance/reviews

2. Reports Page (app/(dashboard)/reports/page.tsx)
   - requireMinRole(HR_ADMIN)
   - Left sidebar: report type links (Headcount, Leave Utilization, Attendance Summary, Attrition, Custom)
   - Right: report panel — filters at top, Generate button, results below

   Each report panel:
   - Headcount: no required filters; optional dept filter → Bar chart (by dept) + summary table
   - Leave Utilization: year selector → Stacked bar chart (used vs remaining per type)
   - Attendance Summary: month+year pickers → Table per employee
   - Attrition: date range pickers → Table of departed employees
   - Custom: entity selector + dynamic filters → flat table of results

   "Export CSV" button on each panel → calls same API route with format=csv → triggers browser download

3. Settings Page (app/(dashboard)/settings/page.tsx)
   - requireMinRole(HR_ADMIN)
   - Tabs: Departments | Leave Policies | Holidays | User Management

   Departments tab:
   - Table of departments with head employee name + employee count
   - Add Department button → inline form row at top of table
   - Edit (pencil icon) → row becomes editable
   - Delete (only if 0 employees)

   Leave Policies tab:
   - Grid by grade: rows are leave types, cells are editable day counts
   - Save button per grade row

   Holidays tab:
   - List of holidays for current year with type badge (National/State)
   - Add Holiday button → modal (name, date, isNational)
   - Delete button (future holidays only)

   User Management tab:
   - Table: employee name, email, role badge, last login, actions
   - Change Role: dropdown to set role (SUPER_ADMIN only)
   - Reset Password button → modal to set a new password for that user
```

---

## PHASE 4 — Polish & Production (Weeks 13–16)

---

### PROMPT 19 — Notification System + Email via Resend

```
Build the full notification system with in-app notifications and email via Resend.

1. Install Resend:
   npm install resend

2. Create lib/email.ts:
   - Import Resend from 'resend'
   - Create a singleton Resend client using RESEND_API_KEY env var
   - Export sendEmail({ to, subject, html }): Promise<void>
     - In development (NODE_ENV !== 'production'): log to console instead of sending
     - In production: call resend.emails.send()
     - FROM address: "ELEMENT EMS <noreply@[your-verified-domain]>" — use env var EMAIL_FROM
   - Create reusable email HTML templates (plain, clean, green-branded):
     - leaveApprovalEmail(employee, leaveRequest): HTML string
     - leaveApplicationEmail(manager, employee, leaveRequest): HTML string
     - reviewNotificationEmail(employee, cycle): HTML string

3. Create lib/notifications.ts:
   - createNotification(prisma, { userId, type, title, message }): creates DB record
   - notifyLeaveApplication(leaveRequest): creates DB notification for manager + sends email
   - notifyLeaveResolution(leaveRequest, status): creates notification for employee + sends email
   - notifyReviewInitiated(review): notifies employee and reviewer
   - notifyReviewSubmitted(review): notifies HR
   - notifyReviewClosed(review): notifies employee
   - notifyAnnouncement(announcement, userIds[]): bulk DB notifications
   
   Call the appropriate notifyX function inside each existing API route where these events happen
   (leave requests, review status changes). Replace any placeholder comment that said "Create Notification".

4. Notification API routes:
   app/api/notifications/route.ts                 → GET (list, with ?unreadOnly=true)
   app/api/notifications/[id]/read/route.ts       → PUT (mark one read)
   app/api/notifications/read-all/route.ts        → PUT (mark all read)
   app/api/announcements/route.ts                 → GET (last 10), POST (create, HR_ADMIN+)

5. Frontend additions:

   Notification Bell (add to the top bar in app/(dashboard)/layout.tsx):
   - Use TanStack Query with refetchInterval: 30000 to poll /api/notifications?unreadOnly=true
   - Bell icon (Lucide BellIcon) with red badge showing unread count
   - Click → dropdown panel (fixed width, scrollable):
     * "Mark all read" button at top
     * List of recent 10 notifications: icon by type, title, time-ago, unread dot
     * Click notification → mark read + navigate to relevant page
   - When count is 0: no badge shown

   Announcement Banner (add to dashboard page):
   - Fetches GET /api/announcements
   - Shows the latest announcement as a dismissable banner below the page header
   - Dismiss button stores dismissed ID in localStorage so it doesn't reappear
```

---

### PROMPT 20 — Audit Log Viewer + DB Backup Strategy

```
Finalize the audit log viewer and set up a database backup strategy for Neon.

1. Audit Log API:
   app/api/audit-logs/route.ts (GET):
   - requireMinRole(SUPER_ADMIN)
   - Query params: entity, entityId, userId, dateFrom, dateTo, page (default 1), limit (default 50)
   - Return paginated list: id, actor.employee.name, action, entity, entityId, oldValue, newValue, createdAt
   - Most recent entries first

2. Audit Log UI:
   Add an "Audit Log" link to the Settings page (SUPER_ADMIN only tab)
   app/(dashboard)/settings/audit-log/page.tsx:
   - Filters: entity dropdown, date range, search by user
   - Table: timestamp | actor | action badge | entity | entityId | before/after JSON toggle
   - "before/after" toggle: clicking expands a row to show formatted JSON diff
   - Pagination

3. AuditLog middleware helper:
   Update lib/audit.ts to export:
   - logAction(prisma, { userId, action, entity, entityId, oldValue?, newValue? }): creates AuditLog record
   - Go through all existing API routes (employees, departments, leave, attendance, performance, documents)
     and ensure every CREATE/UPDATE/DELETE calls logAction. Replace any existing placeholder calls.

4. Backup strategy (Neon + R2):
   Create scripts/backup.ts:
   - Uses the Neon API to trigger a manual branch snapshot (Neon stores branches; this creates a dated branch)
   - Alternatively: uses pg_dump via child_process to dump the DB to a .sql file, then uploads to R2
     under key: backups/db-{YYYY-MM-DD}.sql
   - Also lists all Document files in R2 and exports a manifest JSON uploaded as backups/r2-manifest-{date}.json
   - Add to package.json scripts: "backup": "ts-node scripts/backup.ts"

5. Add a note in README.md:
   Since we use Neon (managed PostgreSQL), Neon automatically takes daily point-in-time backups
   on the free tier (1-day retention). For longer retention, the backup script exports to R2.
   Set up a cron job (or Vercel Cron) to run the backup script daily.

6. Create vercel.json at the project root:
   - Add a cron job that calls GET /api/cron/backup daily at 02:00 UTC
   app/api/cron/backup/route.ts:
   - Protected by a CRON_SECRET header check (set CRON_SECRET in env)
   - Calls the backup logic (pg_dump equivalent or Neon branch snapshot)
   - Returns { success: true, timestamp }
```

---

### PROMPT 21 — Security Hardening

```
Apply security hardening across all Next.js API routes and the app.

1. Install: npm install @upstash/ratelimit @upstash/redis (or use a simple in-memory rate limiter)
   For the free Vercel deployment, use a simple in-memory map rate limiter:
   Create lib/rate-limit.ts:
   - A lightweight sliding window rate limiter using a Map (resets per function cold start)
   - rateLimit(key: string, limit: number, windowMs: number): { success: boolean, remaining: number }
   - Apply to login route: max 10 attempts per 15 minutes per IP

2. Security headers via next.config.ts:
   Add headers() configuration:
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy: camera=(), microphone=(), geolocation=()
   - Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'

3. Apply rate limiting to the login route (app/api/auth/login/route.ts):
   - Extract IP from x-forwarded-for header (Vercel sets this)
   - If rate limit exceeded: return 429 with { error: "Too many login attempts. Try again in 15 minutes." }

4. Cookie hardening (already done in Prompt 3, but verify these settings):
   httpOnly: true
   secure: true
   sameSite: "lax"
   path: "/"
   
5. Input sanitization — create lib/sanitize.ts:
   - sanitizeString(str): trim, strip < > characters (prevent HTML injection into DB)
   - sanitizeFilename(name): remove path separators, null bytes, control chars; replace spaces with _
   Apply sanitizeString to all user-supplied text fields in POST/PUT routes before saving to DB.

6. File upload security (update app/api/documents/upload/[employeeId]/route.ts):
   - Read the first 8 bytes of the file buffer and check magic bytes for allowed types:
     PDF: starts with %PDF
     JPEG: starts with FF D8 FF
     PNG: starts with 89 50 4E 47
     DOCX: starts with 50 4B (it's a ZIP)
   - Reject if magic bytes don't match the declared MIME type
   - Reject filenames with .. or / or \ in them
   - Use sanitizeFilename before constructing the R2 key

7. Environment variable validation on startup:
   Create lib/env.ts:
   - Use zod to validate all required env vars are present and non-empty at startup
   - Required: DATABASE_URL, JWT_SECRET, RESEND_API_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
               R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
   - Import lib/env.ts in lib/db.ts so it runs on first DB access
   - If any are missing: throw a clear error ("Missing required environment variable: X")

8. Add a security summary comment block to app/api/auth/login/route.ts listing all measures.
```

---

### PROMPT 22 — Mobile Responsiveness & Accessibility Audit

```
Audit and fix the entire frontend for mobile responsiveness and WCAG 2.1 AA accessibility.

Mobile (minimum 375px, tablet 768px, desktop 1280px):

App Shell:
  - Sidebar hidden on mobile; hamburger button in top bar toggles it as an overlay
  - Overlay sidebar closes when user clicks outside or presses Escape
  - Top bar doesn't overflow on mobile

All pages — check and fix:
  - All data tables: wrap in overflow-x-auto container so they scroll horizontally on mobile
    (do NOT collapse to cards — tables stay as tables but become scrollable)
  - All filter bars: wrap filters so they stack vertically below 768px
  - All form fields: full width on mobile, stacked labels above inputs
  - KPI cards on dashboard: 4-col → 2-col (tablet) → 1-col (mobile)
  - Buttons: minimum height 44px on touch targets
  - Modals: full-screen on mobile (100vw × 100vh), scrollable content

Accessibility:
  - All form inputs: ensure each has a <label htmlFor> linking to the input's id
  - All icon-only buttons: add aria-label (e.g. <button aria-label="Close modal">)
  - All status badge colours: must meet 4.5:1 contrast ratio — check and fix text/bg colour pairs
  - Focus styles: ensure all interactive elements show a visible focus ring (add ring-2 ring-primary/50 on focus)
  - Modals: on open, move focus to first focusable element inside; trap Tab within modal; close on Escape
  - All avatars: add alt="[employee name] avatar" or alt="" for decorative ones
  - Page titles: in each page component, add:
      import { useEffect } from 'react'; useEffect(() => { document.title = "Dashboard | ELEMENT EMS" }, [])
  - Semantic HTML: ensure each page has one <main> element; nav links are in <nav>; sidebar is <aside>
  - Skip-to-main link: add a visually hidden "Skip to main content" <a href="#main-content"> as first focusable element in layout

After fixing, output a short summary:
  "Fixed: [list of what was changed]"
```

---

### PROMPT 23 — E2E Tests with Playwright

```
Set up Playwright and write end-to-end tests for the most critical flows.

Install:
  npm install -D @playwright/test
  npx playwright install chromium

Create playwright.config.ts at project root:
  - baseURL: http://localhost:3000
  - testDir: ./tests/e2e
  - Use chromium only (to keep test suite fast)
  - Retries: 1 in CI, 0 locally
  - reporter: html

Create tests/e2e/helpers/auth.ts:
  - loginAs(page, email, password): navigates to /login, fills form, submits, waits for /dashboard

Create a Playwright global setup file tests/e2e/setup/seed-test-db.ts:
  - Uses Prisma to seed a clean test dataset before tests run
  - Creates: 1 Super Admin, 1 HR Admin, 1 Team Lead, 2 Employees in a "Test Department"
  - Credentials: testadmin@element.gov.in / Test@1234, etc.
  - The test DATABASE_URL should point to a separate Neon branch (set in .env.test)

Write these test files:

tests/e2e/auth.spec.ts
  - Login with valid credentials → URL is /dashboard
  - Login with wrong password → error message visible on page
  - Visiting /dashboard while logged out → redirected to /login
  - Logout button → redirected to /login

tests/e2e/employees.spec.ts (as HR Admin)
  - Navigate to /employees → directory loads with employee cards
  - Open Add Employee modal → fill all fields → submit
  - New employee appears in directory search results
  - Open employee profile → tabs visible
  - Edit phone number → save → profile shows new number
  - Deactivate employee → status badge changes to "Inactive"

tests/e2e/leave.spec.ts
  - Employee logs in → applies for 2 days Casual Leave → success toast shown
  - Team Lead logs in → sees pending request in Team Requests tab
  - Team Lead approves → status badge changes to Approved
  - Employee logs back in → leave balance reduced by 2

tests/e2e/attendance.spec.ts
  - Employee logs in → Check In button visible
  - Click Check In → button changes to Check Out, time shown
  - Click Check Out → hours worked shown

tests/e2e/reports.spec.ts (as HR Admin)
  - Navigate to /reports → Headcount report loads
  - Click Export CSV → file download triggered (check download event)

Add to package.json scripts:
  "test:e2e": "playwright test"
  "test:e2e:ui": "playwright test --ui"
```

---

### PROMPT 24 — First-Run Wizard + Vercel Deployment

```
Build the first-run setup wizard and prepare the project for Vercel deployment.

1. First-Run Wizard (app/(dashboard)/setup/page.tsx):
   - This page is only accessible if departments count === 0
   - In app/(dashboard)/layout.tsx: check GET /api/setup/status on load
     If { needsSetup: true }: redirect to /setup (and block all other routes until setup is done)
   - app/api/setup/status/route.ts (GET): requireMinRole(SUPER_ADMIN), returns { needsSetup: boolean }

   /setup page — multi-step wizard (use local state to track step):

   Step 1 — Create Departments
     - "Add Row" button; table of rows: Department Name, Head Employee (optional dropdown)
     - At least 1 department required before proceeding
     - "Save & Continue" → POST each to /api/departments

   Step 2 — Import Employees
     - CSV upload widget: drag-and-drop or file picker
     - "Download CSV Template" button → returns a blank template CSV
     - Upload → POST /api/employees/import → shows result: { created, skipped, errors }
     - Errors shown inline if any
     - "Skip for now" option to proceed without importing

   Step 3 — Configure Leave Policies
     - Table with rows per leave type, columns per grade
     - Pre-filled with sensible defaults (e.g. Casual: 12 days, Earned: 15 days, Sick: 10 days)
     - All cells editable
     - "Save Policies" → bulk POST to /api/leave/policies

   Step 4 — Initialize Leave Balances
     - Shows employee count
     - "Initialize Leave Balances for [Year]" button
     - POST /api/leave/balance/initialize → shows success count
     - Progress indicator while running

   Step 5 — Done
     - Checklist summary showing all steps completed
     - "Go to Dashboard" button → navigate to /dashboard
     - After this: /api/setup/status returns { needsSetup: false } so wizard never shows again

2. Vercel deployment configuration:

   Create vercel.json:
   {
     "crons": [{ "path": "/api/cron/backup", "schedule": "0 2 * * *" }]
   }

   Create .env.example with ALL required variables and a description comment for each.

   Update next.config.ts:
   - Add: output: 'standalone' is NOT needed for Vercel (remove if present)
   - Ensure images from R2_PUBLIC_URL domain are allowed in next/image config

3. README.md (complete, at project root):

   ## ELEMENT EMS — Setup Guide

   ### Tech Stack
   [List stack with links]

   ### Local Development
   1. Clone repo
   2. cp .env.example .env.local and fill in values
   3. npm install
   4. npx prisma migrate dev
   5. npx prisma db seed
   6. npm run dev → app at http://localhost:3000
   7. Login: admin@element.gov.in / Admin@1234

   ### Deploy to Vercel (Free)
   1. Push code to GitHub
   2. Import repo in Vercel dashboard
   3. Add all env vars from .env.example in Vercel → Settings → Environment Variables
   4. Deploy
   5. After first deploy: visit https://your-app.vercel.app → run through setup wizard

   ### Infrastructure Accounts Needed (all free)
   - GitHub: code hosting
   - Vercel: hosting and deployment
   - Neon: PostgreSQL database
   - Cloudflare R2: file storage
   - Resend: transactional email

   ### Database Migrations
   When schema changes:
   1. Edit prisma/schema.prisma
   2. npx prisma migrate dev --name [description]
   3. Commit and push → Vercel redeploys

   ### Resetting the Database
   npx prisma migrate reset (destroys all data — development only)

   ### Troubleshooting
   [Common issues and fixes]
```

---

## Done ✅

After Prompt 24 you will have a fully functional, production-ready Employee Management System for ELEMENT Nagaland — deployed on Vercel for free, with:

**Features:**
- Multi-user authentication + full RBAC (6 roles)
- Employee directory with bulk CSV import/export
- Leave management with approval workflow + email notifications
- Attendance tracking (check-in/out, reports, manual entry)
- Performance review cycles (self-assessment + manager review)
- Document management via Cloudflare R2 + letter generation
- Analytics dashboard + custom report builder with CSV export
- In-app notification center + email notifications via Resend
- Audit logging + automated daily DB backup
- First-run setup wizard
- Mobile-responsive + WCAG 2.1 AA accessible UI
- E2E tested with Playwright

**Infrastructure (100% free):**
- GitHub — code hosting
- Vercel Hobby — frontend + API hosting, auto-deploy from GitHub
- Neon — serverless PostgreSQL (3GB free)
- Cloudflare R2 — file storage, zero egress fees (10GB free)
- Resend — transactional email (3,000/month free)

**Total monthly cost: ₹0**
