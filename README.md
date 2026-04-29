# ELEMENT Nagaland — Employee Management System

A localized, zero-cost architecture Employee Management System designed for ELEMENT — Government of Nagaland. This application allows you to track, manage, and organize your workforce effectively directly from your web browser.

## Features

- **Dashboard**: View overall metrics including total employees, active staff, and departments. Quickly see recently added members.
- **Employee Directory**: Browse employees using a Grid or List view. Sort and filter the directory by department and status.
- **Employee Profiles**: View detailed information about employees, including personal details, employment information, and emergency contacts.
- **Manage Employees**: Add new employees, edit existing records, or remove them from the system.
- **Data Import & Export**: Easily backup or migrate data by exporting your employee list to a CSV file or importing a CSV file to populate the system.
- **Dark Mode**: Toggle between light and dark themes for comfortable viewing.
- **Local Storage**: All data is securely stored locally in your browser using `localStorage`, ensuring zero server costs and fast access.

## How to Use

Since this is a client-side application built with HTML, CSS, and Vanilla JavaScript, there is no need for a complex backend setup or a local server to get started.

### 1. Installation
Simply clone this repository or download the source code as a ZIP file and extract it to a folder on your computer.

### 2. Running the Application
To run the application, just double-click the `index.html` file, or right-click it and choose **Open with** -> your preferred modern web browser (e.g., Chrome, Firefox, Safari, Edge).

### 3. Usage Guide

- **Navigating**: Use the sidebar to switch between the **Dashboard** and the **Directory**.
- **Adding an Employee**: Click the **New Employee** button located at the bottom of the sidebar or fill in the required details in the modal that pops up.
- **Importing Data**: In the Directory view, click the **Import** button to upload a CSV file containing employee data. Ensure your CSV has valid headers (e.g., Name, Email, Role, Department).
- **Exporting Data**: Click the **Export** button in the Directory view to download your current employee list as a CSV file.
- **Viewing Details**: Click on any employee card in the Directory to view their detailed profile, edit their information, or delete their record.

## Important Note on Data Persistence
All employee data is saved directly in your web browser's `localStorage`. This means:
- The data will persist even if you close the browser or refresh the page.
- The data is unique to the browser you are using. If you open `index.html` in a different browser (e.g., Safari instead of Chrome) or on a different computer, the data will not be synchronized unless you export it to a CSV and import it there.
- Clearing your browser's site data or cache might erase the employee data. It is recommended to use the **Export** feature regularly to keep backups.

---
**Company**: [http://elementnagaland.in/](http://elementnagaland.in/)