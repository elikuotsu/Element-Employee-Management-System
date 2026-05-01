# Infrastructure Requirements

This document outlines the hardware, network, and software infrastructure required to run the Element Nagaland Employee Management System, tracking its evolution from the current standalone setup to a fully scaled cloud deployment.

---

## 1. Current Phase: Standalone Local Application
**Design Philosophy:** Zero-Footprint & Maximum Portability
Currently, the application is designed to be purely locally executed, preventing the need for any IT overhead, cloud subscription costs, or server provisioning.

### Required Infrastructure:
*   **Hardware (Server):** None.
*   **Hardware (User/Client):** Any standard desktop or laptop (Windows, macOS, Linux).
*   **Network:** None. 100% Offline capability.
*   **Software Requirements:**
    *   A Modern Web Browser (Google Chrome, Microsoft Edge, Safari, Firefox).
    *   *Note: Node.js, Python, Docker, or any database engines are explicitly **NOT** required.*
*   **Storage Space:** < 5 MB of hard drive space. Data is stored entirely within the browser's `Web Storage API` limits (typically safely supporting up to ~5MB to 10MB of JSON text, rendering tens of thousands of basic employee records possible).

---

## 2. Future Vision Phase A: Office Network Access
**Design Philosophy:** Collaborative Intranet via Lightweight Node Server
If the requirement shifts so that multiple managers in the office must log in and view/edit the same employee database simultaneously, the application will need to shift to a local server architecture.

### Required Infrastructure:
*   **Hardware (Server):** 
    *   1x Local Office Machine acting as a "Hub" (Can be a standard Desktop PC or a Raspberry Pi left running 24/7).
    *   Minimum specs: 2GB RAM, 2 Core CPU.
*   **Hardware (User/Client):** Any computer or tablet connected to the office Wi-Fi network.
*   **Network:** 
    *   Standard Office Local Area Network (LAN/WLAN) Router.
    *   The "Hub" machine should be assigned a Static Local IP Address (e.g., `192.168.1.50`) by the IT team so administrators can reliably surf to it over the browser.
*   **Tech Stack / Software Dependencies:**
    *   **Runtime:** Node.js installed on the Hub machine.
    *   **Database Engine:** SQLite (a zero-configuration, file-based SQL database). No database server like MySQL needs to be installed—it lives as a single secure `.sqlite3` file on the hard drive.

---

## 3. Future Vision Phase B: Full Cloud Hosted Ecosystem
**Design Philosophy:** Enterprise Availability & High Security
If the tool scales to be used by government/district branches across the entire state of Nagaland where offline access is less relevant than universal remote accessibility, a full enterprise migration is required.

### Required Infrastructure:
*   **Hardware (Server):** Provisioned Cloud Compute instances. No physical servers maintained in-office.
*   **Compute / Hosting Platform:**
    *   Platform-as-a-Service (PaaS) such as **Vercel**, **Heroku**, or **AWS Elastic Beanstalk**.
    *   This will actively run the application backend (e.g., Next.js APIs or Node Express).
*   **Managed Database (Relational DB):**
    *   A managed cloud PostgreSQL Database (e.g., **AWS RDS**, **Supabase**, or **Neon**). This ensures automatic regional backups, encryption-at-rest, and high concurrency handling.
*   **Blob Storage (For File Uploads):**
    *   An Object Storage bucket like **AWS S3** or **Cloudflare R2** to act as a secure vault for uploaded employee Resumes (PDFs), scanned Identity Cards, and Profile Picture avatars.
*   **Network & Security:**
    *   A registered public Domain Name (e.g., `staff.elementnagaland.in`).
    *   TLS / SSL Certificates (HTTPS strict).
    *   Third-party Authentication provider (e.g., **Auth0**, **Clerk**) to manage secure Logins, Passwords, and Role-Based Access Controls (Admin vs Standard Viewer).
