# HYDEV Project Manager

> A personal project tracker — a mini GitHub for your local development projects.

## Overview

HYDEV Project Manager is a Progressive Web App (PWA) that helps you organize and track your local development projects in one place. Add any folder, see what each project is about (auto-filled from `README.md`), and jump straight to your code.

## Features

- 📁 **Folder Selection** — Add any local project folder
- 📝 **README Auto-detection** — Reads your project's `README.md` for description
- 🧰 **Project Type Detection** — Locally detects Android, JavaScript frameworks, Node.js, Python, Rust, Go, .NET, PHP, Ruby, and web projects
- 🔍 **Search & Filter** — Find projects instantly by name or description
- 🎨 **Dark/Light Theme** — Switch themes to match your environment
- 📱 **PWA Support** — Install on your home screen, works offline
- ⚡ **Manual Ordering** — Drag-free, button-based reordering
- 🎯 **Quick Access** — Click any project card to open its folder
- ✏️ **Edit & Delete** — Full project management

## Tech Stack

- Vanilla HTML5
- CSS3 with custom properties
- JavaScript (ES6+)
- Service Worker (offline support)
- Web App Manifest (PWA)
- File System Access API (folder picking)

## Setup

### 1. Setup Icons

Copy your HYDEV logo as PWA icons:

1. Create an `icons` folder in the project root
2. Copy your `hydev-logo.png` to:
   - `icons/icon-192.png` (192x192 px)
   - `icons/icon-512.png` (512x512 px)

You can resize using any image editor (Paint, Photoshop, online tools).

### 2. Run Locally

You have a few options:

**Option A: Use a local server (recommended for PWA features)**

If you have Python installed:
```bash
cd "C:\Users\Aliyu Jazuli\Documents\Hydev Project Manager"
python -m http.server 8000
```

If you have Node.js:
```bash
cd "C:\Users\Aliyu Jazuli\Documents\Hydev Project Manager"
npx serve
```

Then open `http://localhost:8000` in your browser.

**Option B: Direct file access**

Double-click `index.html` to open in your browser. Note: Some PWA features may be limited due to browser security.

### 3. Install as PWA

1. Open the app in Chrome/Edge
2. Click the install icon in the address bar (or use the menu)
3. The app will install as a standalone app on your system

## Project Structure

```
Hydev Project Manager/
├── index.html          # Main HTML
├── style.css           # Styles (dark/light themes)
├── app.js              # App logic
├── sw.js               # Service Worker (offline)
├── manifest.json       # PWA manifest
├── icons/              # App icons
│   ├── icon-192.png
│   └── icon-512.png
└── README.md           # This file
```

## How It Works

1. **Add a Project** — Click "Add Project", give it a short name, and select the folder
2. **Auto-description** — The app tries to read `README.md` from the folder
3. **Project type** — When run through `start.bat`, the local server inspects project files and identifies the project type; existing projects are detected when the app starts
4. **Manage** — Move projects up/down, edit, delete, or open in File Explorer
5. **Search** — Filter by name or description in real-time

## Browser Support

- Chrome/Edge (full PWA support)
- Firefox (most features, no folder picker)
- Safari (limited PWA support)

## Future Enhancements

- Drag and drop reordering
- Project tags/categories
- File preview integration
- Multi-user support
- Cloud sync (optional)

## License

© HYDEV 2026 — All rights reserved.

## Author

**Aliyu Muhammad Jazuli (Hydr)**
- Software Engineering Student, Bayero University Kano
- HYDEV Ecosystem
