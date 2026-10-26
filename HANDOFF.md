# Project Handoff Document: ระบบจองห้องเรียน (Classroom Booking & Timetable System)

**Date**: 2026-10-26  
**Workspace**: `d:\Webapp\ระบบจองห้องเรียน`  
**Current Git Branch**: `main`  
**Latest Commit**: `80cd8b2` (`feat(schedule): Replace class group filter chips with grouped dropdown`)  
**GAS Deployment**: `@184` on deployment ID `AKfycby2Zk6Cl6vTr1YTf8zCRjAodngMz9SwlqzyHM4Ygt-cDtYF8nCQWiJlGshQVCkGX-pvAA`

---

## 1. Executive Summary & Context

This project is a web-based **Classroom Booking and Timetable Management System** for an educational institution.
- **Frontend**: Single-page application using HTML5, Bootstrap 5, FontAwesome, SweetAlert2, Flatpickr, SheetJS (`xlsx-js-style`), and custom JavaScript located in `js/app.js` and `css/style.css`.
- **Backend**: Google Apps Script (GAS) Web App integrated with Google Sheets as the database, deployed and synced via `clasp` (configurations in `.clasp.json` and `.claspignore`).

---

## 2. Recent Accomplishments & Commits (Oct 24–26, 2026)

| Commit Hash | Type / Scope | Description |
| :--- | :--- | :--- |
| `80cd8b2` | `feat(schedule)` | Replaced multi-row wrapping class group filter chips in summary grid with accessible dropdown `<select>` grouped by department (`optgroup`) with count badges and clear filter button. |
| `cabc47a` | `fix(schedule)` | Formatted timetable time slots with `HH:mm` padding (`normTimeStr`) and sorted slots chronologically by minutes (`toMin`) for Excel export and Web Editor. |
| `ec46608` | `feat(schedule)` | Added classGroup (สาขา×ชั้นปี) in ClassSchedule col 9, import wizard, and group-based timetable Excel export. |
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

### B. Timetable Editor (`scheduleEditor`) — redesigned 2026-10-25
- UI Container: `#scheduleEditorContent` in `index.html` (tab button `#scheduleEditor-tab`). Visual system lives in `css/style.css` under the `.schedule-editor-*` / `.se-*` block (appended at end of file).
- State Store: `window.__classScheduleState` in `js/app.js` (`roomId, day, startTime, endTime, subject, instructor, validFrom, validTo` + `isDirty`, `uiDayFilter`). Loads via `getClassScheduleAdmin`, saves via `saveClassSchedule`.
- Slot Editing Modal: `#classSlotModal` (fields `slotDay/slotStart/slotEnd/slotSubject/slotInstructor/slotValidFrom/slotValidTo`, time inputs `step=1800`).
- Grid interactions use **event delegation** on `#classScheduleGrid` (`data-se-action/day/start/end` attributes) — no inline `onclick` with interpolated sheet data (XSS-safe via `safe()` + `safeAttr()`). Slot cards and empty cells are keyboard-operable (`role=button`, `tabindex=0`, Enter/Space).
- **Drag & drop (V1.5)**: slot cards drag between cells via Pointer Events (mouse + touch, `touch-action:none` on cards). Drop on empty cell = move (overlap re-checked via `toMin()` — legacy rows may already intersect); drop on occupied cell = swap behind `#scheduleConfirmModal` confirm (exchanges only `day/startTime/endTime`, `validFrom/validTo` stay with the subject). Drag mutates local state + `isDirty` only — persists via the same "บันทึกทั้งหมด" batch save. Binding: `bindScheduleDragEvents()` (delegation, guard `dataset.seDndBound`), ghost/drop-hint CSS in `.se-*` block; text selection is cleared at drag start (a stale selection turns the next gesture into a native text drag → `pointercancel`).
- **Touch panning tradeoff (deliberate)**: `touch-action:none` on slot cards means touch-panning the grid cannot START on a card — pan from empty cells or the sticky time column instead. Letting cards pan would make finger-drag impossible (the browser steals the pointer). A long-press-to-drag gesture is the real fix if ever needed — new feature, not a polish item. Ghost is `aria-hidden`, and the `#seDragLive` region is created at bind time with clear-then-set announcements (SR-safe repeats).
- Dirty-state protection: `isDirty` set on slot save/delete; guards on room switch, tab re-entry, and `beforeunload`; persistent badge on `#btnSaveAllSchedule` ("ยังไม่ได้บันทึก").
- Overlap prevention: `saveClassSlot` rejects slots whose time range intersects an existing slot in the same room+day; also validates `validFrom <= validTo`.
- Confirmations use `#scheduleConfirmModal` (Bootstrap, promise-based `showScheduleConfirm`) — not native `confirm()`.
- Mobile ≤768px: day-filter pill bar (`.schedule-editor-dayfilter`) renders one day at a time; time column is sticky-left; no document overflow.

### C. Excel Export (A4 Landscape, one sheet per room)
- Uses `xlsx-js-style` (loaded in `index.html` instead of plain SheetJS, which silently drops cell styles) plus `JSZip`.
- `exportClassScheduleExcel` writes one worksheet per room (tab name = room name, sanitized to Excel rules) plus a first "สารบัญ" sheet: room | จำนวนคาบ | วันที่มีคาบ | เปิดชีต (internal hyperlink `#'sheet'!A1`). Rows with a roomId not in the room registry land in "ห้องอื่น ๆ: <id>" sheets so no data silently disappears. Styling per sheet: TH Sarabun New, time header `#667EEA` white, day headers alternating `#EDEBFB`/`#E0DCF7`, zebra rows `#F8F9FC`, thin borders, A4 landscape fitToWidth.
- Day names must be the full form `พฤหัสบดี` everywhere (constant `DAYS_OF_WEEK`, modal option value, and a short→full normalize in `loadClassScheduleAdmin`). The old short `พฤหัส` silently dropped every Thursday class from both the editor grid and the Excel export.
- **Injection order matters**: OOXML requires `pageSetup` right after `pageMargins` and *before* `ignoredErrors` (which xlsx-js-style writes at the tail). Appending before `</worksheet>` puts it after `ignoredErrors` → Excel flags the sheet as corrupt, "repairs" it by dropping the whole sheet (user gets an empty workbook). openpyxl does *not* catch this — validate element order, not just parse. The patch loops **every** `xl/worksheets/sheet*.xml` and also strips XML-illegal control chars.
- Verified end-to-end on 2026-10-25 (browser export → file inspection): 23 sheets (สารบัญ + 19 rooms + 3 ห้องอื่น ๆ), 102/102 subjects placed including the Thursday column, 22 valid hyperlinks, every sheet XML parse + order `pageMargins → pageSetup → ignoredErrors` OK.

### D. File Structure
- `index.html`: Main SPA frontend layout, modals, and CDN script dependencies.
- `js/app.js`: Main frontend logic, auth, booking lifecycle, timetable editor, Excel export.
- `css/style.css`: Custom theme styles, responsive overrides, timetable grid styling.
- `Code/`: Google Apps Script backend source (`.gs` files managed via `clasp`). Note that `Code/` is excluded from git via `.gitignore` and handled via clasp pushes.
- `graft/`: Repo context graph for instant semantic navigation.

### E. DOM Load-Order Constraint
- `js/app.js` loads **before** modal markup appended at the very end of `<body>` in `index.html`. An element placed after the script tag is not in the DOM when the script parses: its event bindings must live inside a `DOMContentLoaded` listener (existing precedent: session-expiry + password-toggle bindings, `js/app.js` L9371/L9403), never in a parse-time IIFE.
- A null-guarded silent `return` turns this into an invisible dead control — guards on newly added bindings should at least log the element they failed to find.

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

- **Production URL**: https://room-booking-omega-three.vercel.app/ (auto-deploys from `main` via Vercel; `/api/gas` is proxied to the GAS web app server-side)
- **Local Preview**:
   - Open `index.html` in a web browser or serve locally using any static web server:
     ```powershell
     npx serve .
     # or python -m http.server 8000
     ```
- **Graft Refresh (if code changes are made)**: `graft build`
- **Clasp Backend Status (when working with Google Apps Script)**: `clasp status`
