# Canvas Due Date Audit

A Tampermonkey userscript for [Canvas LMS](https://canvas.uva.nl) that helps you audit assignments, quizzes, and files for due/availability dates relative to a chosen cutoff, highlights courses that have already ended, and can move/shift dates from an old course iteration to a new course.

## Features

- **Unified audit view**: Scans assignments, quizzes, and files in a course and lists items with due dates or "Available from" dates before your chosen cutoff.
- **Smart de-duplication**: Graded quizzes are de-duplicated against assignments to avoid double-reporting.
- **Course end highlighting**: Courses whose end date has already passed (from `course.end_at`, enrollment term `end_at`, or parsed from term names like `2026/27 Sem. 1`) are highlighted with a light yellow background on every page of that course.
- **Modules integration**: On course Modules pages (`/courses/:id/modules`), items show an "Available from" label derived from `unlock_at` for published assignments.
- **Move dates between course iterations**: Select items from the audit results and shift all of their dates by  the difference between an old course start date and a new course start date. 
- **CSV export**: Export audit results as CSV for easy sharing or processing.


## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) (or compatible userscript manager)
- Access to Canvas at `https://canvas.uva.nl/` (change the URL in the script header if using a different Canvas instance)
- **Browser settings**: Allow Tampermonkey to run on the Canvas domain. If your browser has strict extension/content script restrictions or "Enhanced Tracking Protection"/Script blocking, disable or whitelist `canvas.uva.nl`. In some browsers you may need to allow third-party cookies or ensure Tampermonkey has the "Allow user scripts" permission for the site.

## Installation

### Option 1: Use the prebuilt file
1. Open Tampermonkey in your browser and create a new script.
2. Copy the contents of `dist/canvasdatechecker.user.js` from this repo.
3. Paste into the Tampermonkey editor and save.

### Option 2: Build from source
1. Clone this repository:
   ```bash
   git clone <repo-url>
   cd canvastools
   ```
2. (Optional) Install dev dependencies for tests:
   ```bash
   npm install
   ```
3. Run the build script (Windows PowerShell):
   ```powershell
   .\build.ps1
   ```
   This concatenates modules in dependency order, runs `node --check` on the assembled artifact, writes `dist/canvasdatechecker.user.js`, and copies it to the clipboard.
4. Paste the clipboard contents into a new Tampermonkey script and save.

## Usage

1. Navigate to any course page on `canvas.uva.nl` (e.g. `https://canvas.uva.nl/courses/12345`).
2. A floating "Audit due dates" button will appear in the bottom-right corner of the page.
3. Click the button to open the audit modal.
4. Choose a cutoff date. The audit will scan assignments, quizzes, and files in the course for:
   - Due dates before the cutoff
   - Availability/start dates ("Available from" / `unlock_at`) before the cutoff (for files and modules)
5. Review results in the table (includes course, type, name with link, due/available dates, audience/overrides where applicable).
6. To move dates from an old course iteration to a new one: select the checkboxes for the items to shift, click "Move dates", enter the old course start date (Monday) and new course start date (Monday) when prompted, review the preview table showing old → new dates, then click "Confirm: update dates in Canvas" to apply the shifts.
7. Click "Export CSV" to download the results as a CSV file.
8. Courses that have already ended will have a light yellow background across all pages of that course.

### Notes

- Files are audited based on `unlock_at` only (Canvas file objects don't expose a due date).
- Graded quizzes are deduplicated against the assignments endpoint to avoid duplicates.
- Course end dates are resolved as: `course.end_at` → enrollment term `end_at` → parsed from term names like `2026/27 Sem. 1` (via `include[]=term` on the course request).

## Development

### Project structure
- `src/main.js` - Tampermonkey header and IIFE wrapper
- `src/config.js` - DOM IDs/styles config
- `src/api.js` - Canvas API helpers (pagination, URL builders, fetchers for assignments/quizzes/files/course)
- `src/dates.js` - Date parsing/formatting/cutoff utilities
- `src/audit.js` - Audit logic and entity resolution
- `src/course.js` - Course end detection and term parsing
- `src/modules.js` - Modules page logic and "Available from" labels
- `src/csv.js` - CSV serialization and download
- `src/ui.js` - Modal, table rendering, styles, course highlight orchestration
- `src/start.js` - Bootstrap
- `build.ps1` - Build script (concatenate + validate + copy)
- `tests/` - Jest unit tests (pure logic)

### Running tests
```bash
npm test
```

Tests cover `dates.js`, `audit.js`, `api.js`, `course.js`, and `csv.js`. DOM/UI code is not unit-tested by design.

### Making changes
1. Edit files under `src/`.
2. Run `.\build.ps1` to rebuild `dist/canvasdatechecker.user.js`.
3. Test in Tampermonkey.
4. Run `npm test` to validate pure logic.

## Version
Current version: 1.4 (see Tampermonkey header in `src/main.js`)

## License
Private project.
