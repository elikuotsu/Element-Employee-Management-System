# Future Expansion Roadmap

The Element Nagaland Employee Management System starts as a minimal, lightweight prototype. However, it is explicitly structured to gracefully scale into a full-featured management utility.

Here is the envisioned expansion path for future updates:

## Phase 2: Feature Rich Local System
*   **Export/Import Data**: Add the ability to export the `localStorage` JSON into a `.csv` or `.xlsx` file, and an import feature to seamlessly transfer the database between different computers locally.
*   **Media & Document Uploads**: Allow the UI to capture images or PDF resumes by converting them to Base64 strings and storing them securely alongside employee profiles.
*   **Leave Management**: Implement a sub-system enabling you to deduct and track Annual Leaves or Sick Leaves over a calendar logic.

## Phase 3: Transition to a Shared Network Application
If the internal team realizes that multiple admins (on multiple different computers) need to access the software simultaneously:
*   **Introduce a Local Server**: We will migrate the Vanilla Javascript application to a lightweight **Node.js** architecture (using Vite or Next.js) hosted on a single office machine acting as the "Hub".
*   **Database Migration**: The application will pivot away from Web Local Storage toward a physical, robust **SQLite Database**, which requires zero cloud setup but safely protects data against browser cache clears.

## Phase 4: Full Cloud Integration (Optional)
Should the Government or Element Nagaland project mandate it:
*   **User Authentication**: We would integrate secure Identity verification protocols and distinct role matrices (Admin, HR, Floor Staff).
*   **Cloud Hosted DB**: Migrate the final SQLite database into a hosted Postgres cloud instance (e.g., AWS, Supabase).
