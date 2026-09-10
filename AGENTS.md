# Canvas Due Date Audit - AGENTS.md

## Background

This project is a Tampermonkey userscript for Canvas LMS (hosted at canvas.uva.nl). It scans course content for assignments, quizzes, and files that have due dates or availability dates ("Available from") before a user-chosen cutoff date. The audit results are displayed in a modal table and can be exported as CSV. It also highlights courses whose end date (explicit, or derived from the enrollment term) has already passed with a light yellow background on every page of the course.

## Goals

- Surface outdated or prematurely available dates across assignments, quizzes, and files in one unified view.
- Make it obvious at a glance when a course has already ended, even when only the enrollment term is configured.
- Keep the userscript maintainable despite growing feature scope (dates + entities + UI + CSV export + course highlight).
- Enable safe refactoring through automated syntax validation and unit tests for pure logic.
- Make installation into Tampermonkey fast and repeatable (clipboard-ready build).

## Architecture

### Source layout

- src/main.js - Tampermonkey metadata header and IIFE wrapper.
- src/config.js - DOM IDs for the button, modal, and injected styles.
- src/api.js - Course ID / Link-header parsing, paginated fetch (injectable), URL builders, and collection fetchers for assignments, quizzes, and files, plus course detail fetcher (with include[]=term).
- src/dates.js - Pure date utilities: parsing, cutoff interpretation, formatting, and HTML escaping.
- src/audit.js - Core audit logic: date kinds, entity name/URL resolution, audience labels, quiz/assignment partitioning, auditEntities(), and auditCourse().
- src/course.js - Pure course-status logic: courseHasEnded() decides whether a course's end_at has passed, and parseTermEndAt() derives an end date from Canvas term names such as "2026/27 Sem. 1".
- src/csv.js - CSV serialization (resultsToCsv) plus a thin DOM download wrapper.
- src/ui.js - Modal HTML, table rendering, CSS injection, and the ended-course background highlight. Orchestration is delegated to auditCourse().
- src/start.js - Bootstrap (initialise()) and IIFE close.

### Build

- build.ps1 concatenates the modules in dependency order, runs node --check on the assembled artifact, writes dist/canvasdatechecker.user.js, and copies the text to the clipboard.
- The compiled file is what gets pasted into the Tampermonkey editor.

### Testing

- Jest-based unit tests live in tests/.
- A small VM-based loader (tests/helpers/loaders.js) evaluates the existing userscript modules without modifying their shape.
- Tests cover pure logic in src/dates.js, src/audit.js, src/api.js (parsing, URL builders, pagination with a fake fetch), src/course.js, and src/csv.js (serialization). DOM/UI code is intentionally not unit-tested.

## Key decisions

- Single-file userscript output via concatenation; no runtime loader or bundler.
- I/O and DOM stay at the edges: fetch, window.location, Blob/download, and modal rendering are wrappers around pure helpers so tests never need a browser.
- Graded quizzes are de-duplicated against the assignments endpoint to avoid double reporting.
- Files are audited via unlock_at only, because Canvas file objects do not expose a due date.
- The floating button is injected with fixed positioning styles at creation time so Canvas left sidemenu does not obscure it.
- Courses whose end date has passed are highlighted with a light yellow background on every page of the course. The end date comes from course.end_at, falling back to the enrollment term's end_at, and finally to parseTermEndAt() on term names like "2026/27 Sem. 1"; the pure helpers stay in course.js while DOM/style injection lives in ui.js. The term object is returned with the course request via include[]=term, because the enrollment-terms API requires a root-account teacher role and is unavailable to students.

## Workflow

1. Edit files under src/.
2. Run ./build.ps1.
3. Paste the clipboard contents into the Tampermonkey editor.
4. Run npm test to validate date/audit/course/api/csv logic after changes.
