# ELEMENT Nagaland — Employee Management System: Master Plan

**Version:** 2.1  
**Date:** April 12, 2026  
**Status:** DRAFT — Awaiting stakeholder approval  
**Organization:** Element Nagaland (Government of Nagaland)  
**Estimated Team Size:** 200+ employees  
**Deployment Model:** Zero-cost local server (LAN) — no external subscriptions or cloud required  

---

## 1. Executive Summary

The current prototype is a lightweight, client-side SPA using localStorage — suitable for a single admin managing a handful of records. To support 200+ employees across departments with leave tracking, attendance, performance reviews, and role-based access, we need a fundamental architectural shift.

This document defines the refined requirements, recommended technology stack, data model, phased rollout plan, and risk mitigation strategy for the full system.

---

## 2. Current State Assessment

**What exists today:**

| Aspect | Current State | Limitation |
|---|---|---|
| Architecture | Single HTML file + vanilla JS | No multi-user support |
| Data storage | Browser localStorage | ~5MB cap, no sharing, lost on cache clear |
| Authentication | None | Anyone with the file can access everything |
| Features | CRUD employee profiles, dashboard stats, search/filter | No leave, attendance, performance, reporting |
| Deployment | Open `index.html` locally | Single-machine only |

**What needs to change:** Everything above must be upgraded. The prototype's UI aesthetic (green nature theme, card layout) is worth preserving as a design foundation.

---

## 3. Refined Requirements

### 3.1 Functional Requirements

#### Module 1: Employee Directory & Profiles
- Centralized directory of all 200+ employees with search, filter, sort
- Rich profiles: photo, personal info, employment details, documents, emergency contacts
- Organizational hierarchy visualization (reporting chains)
- Employee self-service portal (update personal info, view payslips)
- Bulk import/export (CSV, Excel)

#### Module 2: Department & Org Structure
- Create/manage departments and sub-teams
- Assign department heads and team leads
- Org chart with drill-down navigation
- Transfer employees between departments with audit trail

#### Module 3: Leave & Absence Management
- Leave types: Casual Leave, Earned Leave, Sick Leave, Maternity/Paternity, Comp-Off, LWP
- Configurable leave policy per employee grade/category
- Apply → Approve → Track workflow with email notifications
- Leave balance dashboard (self-service for employees)
- Calendar view showing team availability
- Holiday calendar management (national + state-specific for Nagaland)

#### Module 4: Attendance Tracking
- Daily check-in / check-out (manual entry or integration-ready for biometric/RFID)
- Late arrival and early departure flags
- Attendance reports by employee, department, date range
- Integration hooks for future hardware (biometric, card swipe)
- Overtime tracking

#### Module 5: Performance Management
- Goal setting: employees and managers define quarterly/annual objectives
- Review cycles: configurable (quarterly, bi-annual, annual)
- 360-degree feedback: self, peer, manager, skip-level
- Rating scales and competency frameworks
- Performance Improvement Plans (PIP) tracking
- Promotion and increment recommendation workflows

#### Module 6: Reporting & Analytics
- Dashboard with KPIs: headcount trends, attrition rate, leave utilization, department distribution
- Custom report builder (filter by department, date range, status)
- Export to PDF and Excel
- Scheduled report generation (email weekly/monthly summaries)

#### Module 7: Notifications & Communication
- Email notifications for leave approvals, review deadlines, announcements
- In-app notification center
- Company-wide announcement board
- Birthday and work anniversary reminders

#### Module 8: Document Management
- Upload and store employee documents (ID proofs, offer letters, certificates)
- Document templates (offer letter, experience letter, salary slip)
- Auto-generate letters with employee data merge
- Version history for uploaded documents

### 3.2 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Concurrent users | 50+ simultaneous |
| Response time | < 500ms for all CRUD operations |
| Uptime | 99.5% (internal tool tolerance) |
| Data backup | Daily automated backups with 30-day retention |
| Browser support | Chrome, Edge, Firefox (latest 2 versions) |
| Mobile | Responsive design, functional on tablets and phones |
| Accessibility | WCAG 2.1 AA compliance |
| Data privacy | Indian IT Act 2000 compliance, DPDP Act 2023 readiness |

---

## 4. User Roles & Permissions (RBAC)

| Role | Access Level |
|---|---|
| **Super Admin** | Full system access, user management, system configuration |
| **HR Admin** | Manage all employee records, leaves, performance reviews, reports |
| **Department Head** | View/manage their department's employees, approve leaves, conduct reviews |
| **Team Lead** | View their team, approve leaves for direct reports |
| **Employee** | Self-service: view own profile, apply leave, view attendance, submit self-review |
| **Viewer (Auditor)** | Read-only access to reports and records |

Permission matrix should be configurable — not hardcoded.

---

## 5. Recommended Technology Stack

### Guiding Constraint: Zero External Cost
The system must run on a single office machine with no cloud subscriptions, no paid services, and no per-user licensing fees. Everything below is open-source and free.

### Why move away from vanilla JS + localStorage:
localStorage cannot support multi-user access, has a 5-10MB ceiling, offers no backup/recovery, and provides zero security. For 200+ users accessing from different machines, we need a proper client-server architecture — but that server can be a machine already in your office.

### Recommended Zero-Cost Stack:

| Layer | Technology | Cost | Reasoning |
|---|---|---|---|
| **Frontend** | React 18 + TypeScript (via Vite) | Free | Component reuse, fast dev, preserves existing UI patterns |
| **Styling** | Tailwind CSS + custom green theme | Free | Rapid UI, consistent design, preserves Element brand colors |
| **State Management** | TanStack Query (React Query) | Free | Server state management, caching, no Redux complexity |
| **Backend** | Node.js + Express (TypeScript) | Free | Same language as frontend, massive ecosystem |
| **ORM** | Prisma | Free | Type-safe DB access, automatic migrations |
| **Database** | **SQLite** | Free | Zero setup — a single `.sqlite` file on the server disk. No database server process needed. Handles 200+ users with ease for this workload. |
| **Authentication** | **JWT + bcrypt** (custom) | Free | JSON Web Tokens for sessions, bcrypt for password hashing — no third-party auth service needed |
| **File Storage** | Local disk (`/uploads` folder) | Free | Documents stored as files on the server machine; backed up with regular disk backups |
| **Email** | Nodemailer + Gmail SMTP (or org SMTP) | Free | Use a Gmail account or Element Nagaland's email server for notifications |
| **Deployment** | **PM2 process manager** | Free | Keeps Node.js running as a background service, auto-restarts on crash or reboot |
| **Testing** | Vitest (unit) + Playwright (E2E) | Free | Modern testing tools, both open source |

**Total monthly running cost: ₹0**

### Why SQLite over PostgreSQL for this use case:
PostgreSQL is a better database in general, but it requires a separate database server process, user account setup, and configuration. SQLite is a single file on disk — no installation, no service to manage, zero ops overhead. For 200 employees doing mostly CRUD operations (not millions of concurrent transactions), SQLite is perfectly adequate. If the system ever needs to scale to cloud, migrating from SQLite to PostgreSQL via Prisma is a one-line schema change.

### Why JWT + bcrypt over Clerk:
Clerk costs ~$25/month for production use. JWT + bcrypt is what Clerk (and every auth service) uses under the hood. We implement it ourselves: passwords hashed with bcrypt, sessions managed via signed JWTs stored in httpOnly cookies. Secure, zero cost, no external dependency.

### Deployment Method: Local LAN Server (not an installer)

> **An installer was considered and ruled out.** An Electron installer runs a separate app on every employee's machine with its own data — employees would see different databases, leave requests wouldn't sync, and every update would need to be pushed to 200 machines. It's only suitable for single-user offline tools.

**How the local server works:**
```
Office PC (Server Machine)           Employee Devices
┌─────────────────────────┐          ┌──────────────┐
│  Node.js app (PM2)      │◄────────►│  Any Browser │
│  SQLite database file   │  LAN     │  Chrome/Edge │
│  /uploads file storage  │  Wi-Fi   │  No install  │
│  Static IP: 192.168.x.x │          └──────────────┘
└─────────────────────────┘
         │
         ▼
  Access URL: http://192.168.x.x:3000
  (or later: http://element-staff if local DNS is set up)
```

**Server machine requirements:** Any PC or laptop with 4GB RAM and a reliable power connection. A dedicated cheap machine (even a ₹15,000 mini PC or repurposed old desktop) works perfectly.

**Future domain upgrade path (zero re-architecture):**
- Buy a domain (e.g., `staff.elementnagaland.in`, ~₹800/year)
- Point it to the same machine (requires a static public IP from your ISP, ~₹500/month) OR migrate to a cheap VPS (₹500-800/month on DigitalOcean/Hetzner)
- Everything else stays identical — same code, same database

---

## 6. Data Model (Core Entities)

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────┐
│  Department  │──1:N──│   Employee   │──1:N──│  LeaveRequest    │
│              │       │              │       │                  │
│ id           │       │ id           │       │ id               │
│ name         │       │ name         │       │ employee_id (FK) │
│ head_id (FK) │       │ email        │       │ leave_type       │
│ parent_id    │       │ phone        │       │ start_date       │
│ created_at   │       │ role         │       │ end_date         │
└─────────────┘       │ department_id│       │ status           │
                       │ manager_id   │       │ approved_by (FK) │
                       │ join_date    │       │ reason           │
                       │ status       │       └──────────────────┘
                       │ grade        │
                       │ avatar_url   │       ┌──────────────────┐
                       └──────────────┘──1:N──│  Attendance      │
                              │               │                  │
                              │               │ id               │
                              │               │ employee_id (FK) │
                              │               │ date             │
                              │               │ check_in         │
                              │               │ check_out        │
                              │               │ status           │
                              │               └──────────────────┘
                              │
                              │──1:N──┌──────────────────┐
                                      │  PerformanceReview│
                                      │                  │
                                      │ id               │
                                      │ employee_id (FK) │
                                      │ reviewer_id (FK) │
                                      │ cycle            │
                                      │ rating           │
                                      │ goals_json       │
                                      │ feedback         │
                                      │ status           │
                                      └──────────────────┘

Supporting tables:
- User (authentication, linked to Employee)
- Role & Permission (RBAC)
- LeavePolicy (rules per grade)
- LeaveBalance (per employee per year)
- Document (file uploads linked to employee)
- Notification (in-app alerts)
- AuditLog (who changed what, when)
```

---

## 7. UI/UX Design Direction

### Preserve from existing prototype:
- Green/nature-inspired color palette (aligns with Element Nagaland's environmental mission)
- Card-based employee directory layout
- Clean sidebar navigation

### Upgrade:
- **Dashboard**: Replace simple stat counters with interactive charts (headcount trends, leave utilization heatmap, department breakdown pie chart)
- **Navigation**: Add nested sidebar for modules (Directory, Leave, Attendance, Performance, Reports, Settings)
- **Responsive**: Mobile-first approach — employees should be able to apply leave from their phones
- **Dark mode**: Optional, low priority, but design tokens should support it from day one
- **Onboarding flow**: First-time setup wizard for Super Admin (create departments, import employees, set leave policies)

### Key Screens (to be designed):

| Screen | Description |
|---|---|
| Login | Clean login page with Element Nagaland branding |
| Dashboard | KPI cards + charts + quick actions + recent activity feed |
| Employee Directory | Grid/list toggle, filters, search, bulk actions |
| Employee Profile | Tabbed view (Info, Leave, Attendance, Performance, Documents) |
| Leave Calendar | Monthly calendar with team availability overlay |
| Leave Application | Form with date picker, leave type, balance indicator |
| Performance Review | Goal tracker + review form + history |
| Reports | Filter builder + chart display + export button |
| Admin Settings | Departments, leave policies, user roles, system config |

---

## 8. Phased Implementation Plan

### Phase 1: Foundation (Weeks 1–4)
**Goal:** Replace the prototype with a working multi-user system

| Week | Deliverable |
|---|---|
| 1 | Project setup: Vite + React + Express + Prisma + PostgreSQL. Auth with Clerk. CI/CD pipeline. |
| 2 | Employee CRUD: Create, read, update, deactivate employees. Department management. Bulk CSV import. |
| 3 | Dashboard: Stats cards, headcount by department chart, recent activity feed. Employee directory with search/filter. |
| 4 | RBAC: Super Admin, HR Admin, Employee roles. Profile self-service. Testing & bug fixes. |

**Exit criteria:** Admin can log in, manage employees, and employees can view their own profile.

---

### Phase 2: Leave & Attendance (Weeks 5–8)
**Goal:** Core HR operations

| Week | Deliverable |
|---|---|
| 5 | Leave policy configuration. Leave types and balances per grade. |
| 6 | Leave application workflow: apply → manager approval → HR visibility. Email notifications. |
| 7 | Attendance module: daily check-in/out, attendance reports, late flags. |
| 8 | Leave calendar (team view). Leave balance dashboard. Integration testing. |

**Exit criteria:** Employees can apply for leave, managers approve, attendance is tracked daily.

---

### Phase 3: Performance & Documents (Weeks 9–12)
**Goal:** Strategic HR features

| Week | Deliverable |
|---|---|
| 9 | Goal setting framework. Review cycle configuration. |
| 10 | Review workflow: self-assessment → manager review → calibration. Rating system. |
| 11 | Document upload/management. Letter generation templates (offer, experience). |
| 12 | Reporting engine: custom filters, PDF/Excel export. Scheduled reports. |

**Exit criteria:** Full review cycle can be conducted. Documents stored and retrievable. Reports exportable.

---

### Phase 4: Polish & Scale (Weeks 13–16)
**Goal:** Production hardening and optional cloud migration

| Week | Deliverable |
|---|---|
| 13 | Notification center (in-app + email digest). Announcement board. |
| 14 | Audit logging. Data backup automation. Security hardening. |
| 15 | Mobile responsiveness QA. Accessibility audit. Performance optimization. |
| 16 | User acceptance testing (UAT). Documentation. Training materials. Deployment. |

**Exit criteria:** System is production-ready, documented, and users are trained.

---

## 9. Deployment Strategy

### Initial Setup (Zero Cost):
```
1. Install Node.js on the server machine (free, one-time)
2. Clone/copy the project folder to the machine
3. Run: npm install && npm run build
4. Start with PM2: pm2 start server.js --name ems
5. Set PM2 to auto-start on Windows/Linux reboot: pm2 startup
6. Assign a static LAN IP to the server machine via router settings
7. Employees access: http://192.168.x.x:3000
```

**Backup strategy (free):**
- PM2 keeps the server running 24/7 and restarts on crash
- Daily backup script copies the `ems.sqlite` file + `/uploads` folder to a USB drive or network share
- Script runs via Windows Task Scheduler or Linux cron — no paid service needed

**Optional local domain (free, looks more professional):**
- Set the server hostname to `element-staff`
- Add `192.168.x.x  element-staff` to the `hosts` file on each employee's machine (or configure the office router's DNS)
- Employees then access: `http://element-staff:3000`
- IT admin does this once per machine — takes ~2 minutes each

### Future: Domain + Cloud (Optional Upgrade, Low Cost):
| Option | Monthly Cost | What changes |
|---|---|---|
| Keep on LAN + buy domain with static public IP from ISP | ~₹500-800/month | Same server, just exposed to internet |
| Migrate to VPS (Hetzner CX21 or DigitalOcean Basic) | ~₹600-900/month | Same code, SQLite → PostgreSQL migration (1 hour of work) |
| PaaS (Railway, Render free tier) | ₹0 (with limits) | Good for testing, not reliable for production |

Zero re-architecture needed for any of the above — the codebase stays identical.

---

## 10. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Data loss (no backup) | Critical | Medium | Automated daily backups from Week 1. Tested restore procedure. |
| Low user adoption | High | High | Involve department heads in design. Conduct training sessions. Simple, intuitive UI. |
| Scope creep | Medium | High | Strict phase gates. No feature additions mid-phase without sign-off. |
| Single developer bottleneck | High | Medium | Document everything. Use typed code (TypeScript) for maintainability. |
| Internet dependency (cloud) | Medium | Low | Phase 1-2 are fully offline/intranet. Cloud is optional Phase 4. |
| Security breach | Critical | Low | RBAC from day 1. Encrypted passwords. Audit logging. HTTPS in production. |

---

## 11. Open Decisions

### ✅ Resolved:
- **Deployment**: Intranet LAN server only, zero cloud cost. Domain optional later.
- **Budget**: Zero external cost. Free open-source stack throughout.
- **Installer vs server**: Local server — employees access via browser, no installation on their machines.
- **Database**: SQLite (no setup, no cost, upgradeable to PostgreSQL later).
- **Auth**: Custom JWT + bcrypt (no paid auth service).

### ❓ Still Needs Your Input:

1. **Employee logins**: Should all 200+ employees get their own login account (to apply leave, see their profile), or only HR admins and managers? This affects how we design the self-service portal.

2. **Attendance method**: How do you currently track attendance? Manual entry by HR, or is there hardware (biometric scanner, RFID card reader) we need to integrate with?

3. **Email for notifications**: Does Element Nagaland have an office email server (Exchange, Google Workspace)? Or should we use a free Gmail account as the sender for leave approval emails?

4. **Server machine**: Do you have a dedicated machine to run the server, or will it share a machine someone is already using? (Sharing works fine, but a dedicated machine is more reliable.)

5. **Developer**: Who will build this? The plan assumes 1 developer. Timeline can be adjusted accordingly.

---

## 12. Success Metrics

After 3 months of deployment, measure:

| Metric | Target |
|---|---|
| Employee profiles created | 100% of active staff |
| Leave requests processed digitally | > 90% (vs. paper) |
| Average leave approval time | < 24 hours |
| User login frequency | > 80% of staff log in weekly |
| HR time spent on manual data entry | Reduced by 60% |
| System uptime | > 99.5% |

---

*This document should be reviewed by all stakeholders before proceeding to implementation. Approvals needed from: Project Lead, HR Head, IT Administrator.*
