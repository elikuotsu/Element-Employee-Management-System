# Element Nagaland Employee Management System

## Overview
This local Employee Management System was designed entirely using vanilla web technologies (HTML, CSS, and pure JavaScript) to ensure it runs securely and effortlessly on any machine without the need for server configurations, installations, or Node.js. 

Data persistence is managed beautifully and invisibly through your browser's internal **Local Storage**, meaning your records stay intact locally.

## Getting Started
It couldn't be simpler! Just perform the following:
1. Locate the `index.html` file in this directory.
2. Double click the file or Right-Click -> **Open With** and choose a preferred modern web browser (Edge, Chrome, or Safari).

## Key Features Developed

### 1. Beautiful UI & Theme
- **Styling**: Native CSS implementation mirroring a premium, snappy application.
- **Visuals**: A soft, Forest Green aesthetic (`#2e7d32`) mapping to Element Nagaland’s nature and forestry focus, rounded cards, custom typography using 'Outfit', and micro-animations for interactivity.

### 2. High-Level Dashboard
- Provides a fast, real-time Overview. 
- Tracks **Total Employees**, **Active Staff**, and total numerical **Departments**.
- Highlights a list of recently added team members.

### 3. Interactive Directory & Data Management
- Read, search, and navigate through a structured grid of your entire employee tree.
- Quickly search by Name or Email.
- Utilize dropdown lists to filter your staff by specific Departments or Status (Active/Inactive).

### 4. Create and Edit Form
- Added a full CRUD (Create, Read, Update, Delete) capability.
- An interactive modal form controls validation capturing:
  - Full Name, Phone, and Email string maps.
  - Granular selection mapping for Departments.
  - Active/Inactive state handling and Join Date assignment.

## Files
- `index.html`: The structural markup skeleton for the web views.
- `index.css`: The styling tokens and logic representing our theme.
- `app.js`: The application brain controlling Local Storage mapping, View Navigation, DOM manipulation, and search filtering.
