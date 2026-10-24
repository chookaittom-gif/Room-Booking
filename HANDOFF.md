# Project Handoff Document: ระบบจองห้องเรียน (Classroom Booking & Timetable System)

**Date**: 2026-10-24  
**Workspace**: `d:\Webapp\ระบบจองห้องเรียน`  
**Current Git Branch**: `main`  
**Latest Commit**: `b79cbad` (`chore(ignore): ignore .playwright-cli directory`)  

---

## 1. Executive Summary & Context

This project is a web-based **Classroom Booking and Timetable Management System** for an educational institution.
- **Frontend**: Single-page application using HTML5, Bootstrap 5, FontAwesome, SweetAlert2, Flatpickr, SheetJS (`xlsx-js-style`), and custom JavaScript located in `js/app.js` and `css/style.css`.
- **Backend**: Google Apps Script (GAS) Web App integrated with Google Sheets as the database, deployed and synced via `clasp` (configurations in `.clasp.json` and `.claspignore`).

---

## 2. Recent Accomplishments & Commits (Oct 24, 2026)

The recent development focused on cleaning legacy redundant files and delivering a full **Timetable Editor & Excel Export** module for administrators:

| Commit Hash | Type / Scope | Description |
| :--- | :--- | :--- |
| `b79cbad` | `chore(ignore)` | Added `.playwright-cli` to `.gitignore`. |
| `3b62540` | `fix(nav)` | Switched `#scheduleEditor-tab` from Bootstrap class `d-none` to inline `style="display: none;"` matching `#dashboard-tab` pattern so admin visibility toggle works without `!important` conflicts. |
| `ec3ce78` | `fix(schedule)` | Defined safe HTML escaping helper `safe()` in schedule editor scope to resolve runtime `ReferenceError: safe is not defined`. |
| `efb63b6` | `fix(nav)` | Added `#scheduleEditor-tab` button into `#mainTab` navigation pills and updated login auth toggle logic in `js/app.js`. |
| `6fa9405` | `style(a11y)` | Enhanced timetable slot edit modal accessibility: added explicit `for`/`id` bindings on labels, `aria-required`, and keyboard-accessible scroll container (`tabindex="0"`, `role="region"`). |
| `aa7f4e9` | `feat(schedule)` | Implemented interactive Admin Timetable Grid Editor with Google Sheets sync and A4 Landscape Excel Export with TH Sarabun New font. |
| `4d997428` | `chore(cleanup)` | Cleaned legacy unmaintained root `app.js` (9,690 lines deleted), synced action locks and `AbortError` handling into active `js/app.js`. |

---

## 3. Architecture & Key Implementation Details

### A. Navigation & Access Control
- Navigation pills `#mainTab` render tabs: Schedule View, Booking, User Bookings, and Admin-only tabs (`#dashboard-tab`, `#scheduleEditor-tab`).
- Both admin tabs are initialized with `style="display: none;"`. When an Admin or SuperAdmin logs in, `updateAdminNavVisibility(isAdmin)` sets `style.display = ''`.

### B. Timetable Editor (`scheduleEditor`)
- UI Container: `#scheduleEditorContent` in `index.html` (tab button `#scheduleEditor-tab`).
- State Store: `window.__classScheduleState` in `js/app.js` (module scope `js/app.js:L9656-L10227`) holds current classroom and slot rows (`roomId, day, startTime, endTime, subject, instructor, validFrom, validTo`). Data loads via action `getClassScheduleAdmin`, saves via `saveClassSchedule`.
- Slot Editing Modal: `#classSlotModal` allows editing:
  - Subject (`slotSubject`) & Instructor (`slotInstructor`)
  - Day (`slotDay`)
  - Start & End Time (`slotStart` / `slotEnd`, e.g. `8:00`–`16:00` — times, not period numbers)
  - Valid From / Valid To (`slotValidFrom` / `slotValidTo`)
- Security: All dynamic slot outputs run through the `safe()` HTML escape helper to prevent XSS.

### C. Excel Export (A4 Landscape)
- Uses `xlsx-js-style` (loaded in `index.html` instead of plain SheetJS, which silently drops cell styles) plus `JSZip`.
- `exportClassScheduleExcel` writes with `XLSX.write`, then injects `<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>` into the worksheet XML via JSZip before download — community SheetJS builds do not write `!pageSetup`.
- Verified end-to-end on 2026-10-24 (browser export → file inspection): fonts TH Sarabun New (18 bold title, 12 subtitle, 14 body), thin borders, centered alignment with wrap, A4 landscape pageSetup present.

### D. File Structure
- `index.html`: Main SPA frontend layout, modals, and CDN script dependencies.
- `js/app.js`: Main frontend logic, auth, booking lifecycle, timetable editor, Excel export.
- `css/style.css`: Custom theme styles, responsive overrides, timetable grid styling.
- `Code/`: Google Apps Script backend source (`.gs` files managed via `clasp`). Note that `Code/` is excluded from git via `.gitignore` and handled via clasp pushes.
- `graft/`: Repo context graph for instant semantic navigation.

---

## 4. Pending / Next Steps

1. **GAS Backend Deployment Verification** — ✅ VERIFIED (2026-10-24):
   - The timetable editor does **not** use `getTimetable` / `saveTimetableSlot` (this document previously named those actions incorrectly). The real actions are **`getClassScheduleAdmin`** (load) and **`saveClassSchedule`** (save), both implemented in `Code/Code.gs` (L455 / L474) and whitelisted in `allowedActions` (Code.gs L96-97).
   - Sheet schema: `ClassSchedule` with 8 columns `RoomID, Day, StartTime, EndTime, Subject, Instructor, ValidFrom, ValidTo` — matches frontend row fields exactly (`roomId, day, startTime, endTime, subject, instructor, validFrom, validTo`).
   - `saveClassSchedule` uses `LockService` and replaces only the rows of the target `roomId`, keeping other rooms' rows.
   - Live read-only test against the deployed web app (`AKfycby2...`): returned `{"ok":true}` with real timetable rows — PASSED.
   - Write path (`saveClassSchedule`) intentionally **not** exercised against the live sheet; verify via real admin usage or a separate test spreadsheet.
2. **Batch Import / Clone Feature (Optional Future Enhancement)**:
   - Provide ability to duplicate a timetable from one semester/classroom to another.
3. **Automated End-to-End Testing**:
   - Playwright / DevTools testing on timetable interactions and Excel export verification.

---

## 5. Suggested Skills for Next Agent

When picking up work in this repository, the next agent should invoke:
- **`gas-best-practices`**: Best practices for Google Apps Script, clasp sync, LockService, and web app endpoints.
- **`modern-web-guidance`**: DOM, modern styling, and client-side JavaScript practices.
- **`accessibility`**: WCAG 2.2 AA testing for keyboard navigation, ARIA attributes, and color contrast.
- **`commit`**: Conventional commit standards for saving progress cleanly.
- **`graft`**: Fast query and blast-radius analysis across repo symbols and files.

---

## 6. How to Run & Verify

1. **Local Preview**:
   - Open `index.html` in a web browser or serve locally using any static web server:
     ```powershell
     npx serve .
     # or python -m http.server 8000
     ```
2. **Graft Refresh (if code changes are made)**:
   ```powershell
   graft build
   ```
3. **Clasp Backend Status (when working with Google Apps Script)**:
   ```powershell
   clasp status
   ```
