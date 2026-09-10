// ==UserScript==
// @name         Canvas - Audit Assignment Due Dates
// @namespace    canvas-due-date-audit
// @version      1.2
// @description  Find assignments, quizzes and files with due dates or availability dates before a chosen cutoff date.
// @match        https://canvas.uva.nl/courses/*
// @grant        none
// ==/UserScript==

/*
 * This userscript is assembled from the modules in src/ by
 * build.ps1. Do not edit the compiled output in dist/. Edit the
 * modules and re-run .\build.ps1.
 */

(function () {
    'use strict';

    // ------------------------------------------------------------
    // CONFIGURATION
    // ------------------------------------------------------------

    const BUTTON_ID = 'canvas-due-date-audit-button';
    const MODAL_ID = 'canvas-due-date-audit-modal';
    const STYLE_ID = 'canvas-due-date-audit-styles';
    const ENDED_STYLE_ID = 'canvas-course-ended-styles';

    // ------------------------------------------------------------
    // GET COURSE ID
    // ------------------------------------------------------------

    function parseCourseId(pathname) {

        const match = pathname.match(/\/courses\/(\d+)/);

        return match ? match[1] : null;
    }


    function getCourseId() {

        return parseCourseId(window.location.pathname);
    }


    // ------------------------------------------------------------
    // FETCH ALL PAGES FROM CANVAS API
    // ------------------------------------------------------------

    function nextUrlFromLinkHeader(linkHeader) {

        if (!linkHeader) {
            return null;
        }

        const links = linkHeader.split(',');

        for (const link of links) {

            const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);

            if (match && match[2] === 'next') {
                return match[1];
            }
        }

        return null;
    }


    async function fetchAllPages(url, fetchImpl) {

        const doFetch = fetchImpl || fetch;

        let results = [];
        let nextUrl = url;

        while (nextUrl) {

            const response = await doFetch(nextUrl, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(
                    `Canvas API error: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json();

            results = results.concat(data);

            nextUrl = nextUrlFromLinkHeader(
                response.headers.get('Link')
            );
        }

        return results;
    }


    // ------------------------------------------------------------
    // GET COURSE DETAILS
    // ------------------------------------------------------------

    async function fetchJson(url, fetchImpl) {

        const doFetch = fetchImpl || fetch;

        const response = await doFetch(url, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(
                `Canvas API error: ${response.status} ${response.statusText}`
            );
        }

        return response.json();
    }


    function courseUrl(courseId) {

        return (
            `/api/v1/courses/${courseId}` +
            `?include[]=term`
        );
    }


    async function getCourse(courseId, fetchImpl) {

        return await fetchJson(courseUrl(courseId), fetchImpl);
    }


    // ------------------------------------------------------------
    // GET ASSIGNMENTS, QUIZZES AND FILES
    // ------------------------------------------------------------

    function assignmentsUrl(courseId) {

        return (
            `/api/v1/courses/${courseId}/assignments` +
            `?per_page=100` +
            `&include[]=all_dates` +
            `&include[]=overrides`
        );
    }


    function quizzesUrl(courseId) {

        return (
            `/api/v1/courses/${courseId}/quizzes` +
            `?per_page=100`
        );
    }


    function filesUrl(courseId) {

        return (
            `/api/v1/courses/${courseId}/files` +
            `?per_page=100`
        );
    }


    async function getAssignments(courseId) {

        return await fetchAllPages(assignmentsUrl(courseId));
    }


    async function getQuizzes(courseId) {

        return await fetchAllPages(quizzesUrl(courseId));
    }


    async function getFiles(courseId) {

        return await fetchAllPages(filesUrl(courseId));
    }

    // ------------------------------------------------------------
    // DATE HELPERS
    // ------------------------------------------------------------

    function parseCanvasDate(dateString) {

        if (!dateString) {
            return null;
        }

        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    }


    function parseCutoffLocalDate(dateValue) {

        if (!dateValue) {
            return null;
        }

        const date = new Date(dateValue + 'T00:00:00');

        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    }


    /*
     * Display a date using the browser's locale.
     *
     * Dutch Canvas/browser:
     *     08-09-2026 14:30
     *
     * English Canvas/browser:
     *     09/08/2026, 14:30
     *
     * The comparison itself NEVER depends on this formatting.
     */
    function formatDate(dateString, locale) {

        const date = parseCanvasDate(dateString);

        if (!date) {
            return '—';
        }

        return new Intl.DateTimeFormat(
            locale || navigator.language || 'nl-NL',
            {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }
        ).format(date);
    }


    function escapeHtml(text) {

        if (text === null || text === undefined) {
            return '';
        }

        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ------------------------------------------------------------
    // AUDIT ENTITIES
    // ------------------------------------------------------------

    const DATE_KINDS = [
        { field: 'due_at', label: 'Due date' },
        { field: 'unlock_at', label: 'Available from' }
    ];


    function isQuizBackedAssignment(assignment) {

        return (
            Array.isArray(assignment.submission_types) &&
            assignment.submission_types.includes('online_quiz')
        );
    }


    function entityName(entity, type) {

        if (type === 'File') {
            return entity.display_name;
        }

        if (type === 'Quiz') {
            return entity.title || entity.name;
        }

        return entity.name;
    }


    function entityUrl(entity, type, courseId) {

        if (type === 'File') {
            return `/courses/${courseId}/files/${entity.id}`;
        }

        if (entity.html_url) {
            return entity.html_url;
        }

        if (type === 'Quiz') {
            return `/courses/${courseId}/quizzes/${entity.id}`;
        }

        return `/courses/${courseId}/assignments/${entity.id}`;
    }


    function dateEntries(entity) {

        if (
            Array.isArray(entity.all_dates) &&
            entity.all_dates.length > 0
        ) {
            return entity.all_dates;
        }

        return [{
            title: 'Everyone',
            base: true,
            due_at: entity.due_at,
            unlock_at: entity.unlock_at
        }];
    }


    function audienceLabel(entry) {

        if (entry.base === true) {
            return 'Everyone';
        }

        if (entry.title) {
            return entry.title;
        }

        if (entry.assignment_override_id) {
            return 'Override';
        }

        return 'Differentiated';
    }


    function partitionCourseItems(assignments, quizzes, files) {

        const assignmentsToAudit = [];
        const quizzesToAudit = [];
        const filesToAudit = files.slice();

        /*
         * Graded quizzes are also returned by the
         * assignments endpoint (submission type
         * online_quiz). Treat those as quizzes and skip
         * the matching quiz entries so nothing is
         * reported twice.
         */

        for (const assignment of assignments) {

            if (isQuizBackedAssignment(assignment)) {
                quizzesToAudit.push(assignment);
            } else {
                assignmentsToAudit.push(assignment);
            }
        }

        for (const quiz of quizzes) {
            if (!quiz.assignment_id) {
                quizzesToAudit.push(quiz);
            }
        }

        return {
            assignmentsToAudit,
            quizzesToAudit,
            filesToAudit
        };
    }


    function auditEntities(entities, cutoffDate, type, courseId) {

        const results = [];

        for (const entity of entities) {

            /*
             * all_dates contains:
             *
             * - Base/"Everyone" dates
             * - Section overrides
             * - Student overrides
             *
             * Quizzes and files normally only expose their own
             * due_at/unlock_at fields, so the fallback covers them.
             */

            const entries = dateEntries(entity);

            for (const entry of entries) {

                const audience = audienceLabel(entry);

                for (const kind of DATE_KINDS) {

                    const rawDate = entry[kind.field];

                    const date = parseCanvasDate(rawDate);

                    if (!date) {
                        continue;
                    }

                    if (date >= cutoffDate) {
                        continue;
                    }

                    results.push({

                        itemType: type,

                        itemName: entityName(entity, type),

                        itemUrl: entityUrl(entity, type, courseId),

                        audience: audience,

                        dateKind: kind.label,

                        flaggedDate: date,

                        dateRaw: rawDate
                    });
                }
            }
        }


        results.sort(
            (a, b) => a.flaggedDate - b.flaggedDate
        );

        return results;
    }


    function auditCourse(assignments, quizzes, files, cutoffDate, courseId) {

        const {
            assignmentsToAudit,
            quizzesToAudit,
            filesToAudit
        } = partitionCourseItems(assignments, quizzes, files);

        const results = [].concat(

            auditEntities(
                assignmentsToAudit,
                cutoffDate,
                'Assignment',
                courseId
            ),

            auditEntities(
                quizzesToAudit,
                cutoffDate,
                'Quiz',
                courseId
            ),

            auditEntities(
                filesToAudit,
                cutoffDate,
                'File',
                courseId
            )

        ).sort(
            (a, b) =>
                a.flaggedDate - b.flaggedDate
        );

        return {
            results,
            itemCount:
                assignmentsToAudit.length +
                quizzesToAudit.length +
                filesToAudit.length
        };
    }

    // ------------------------------------------------------------
    // COURSE STATUS
    // ------------------------------------------------------------

    function courseHasEnded(course, now) {

        const endAt = parseCanvasDate(
            course && course.end_at
        );

        if (!endAt) {
            return false;
        }

        return endAt < now;
    }


    /*
     * Canvas term names look like:
     *   "2026/27 Sem. 1"
     *   "2026/27 Sem. 1, per. 1-2"
     *
     * The ", per. ..." suffix is ignored.
     *
     * Rules:
     *   Sem. 1 ends on 1 February of the end year.
     *   Sem. 2 ends on 1 September of the end year.
     *
     * Returns a Date, or null if the name cannot be parsed.
     */
    function parseTermEndAt(termName) {

        if (!termName) {
            return null;
        }

        const normalized = termName
            .replace(/,\s*per\.\s*\d+-\d+/i, '')
            .trim();

        const match = normalized.match(
            /^(\d{4})\/(\d{2,4})\s+Sem\.\s*(\d)/i
        );

        if (!match) {
            return null;
        }

        const startYear = parseInt(match[1], 10);
        const shortEnd = parseInt(match[2], 10);
        let endYear;

        if (shortEnd < 100) {
            endYear =
                startYear + (shortEnd - (startYear % 100));
        } else {
            endYear = shortEnd;
        }

        const semester = match[3];

        if (semester === '1') {
            return new Date(endYear, 1, 1);
        }

        if (semester === '2') {
            return new Date(endYear, 8, 1);
        }

        return null;
    }

    // ------------------------------------------------------------
    // CSV EXPORT
    // ------------------------------------------------------------

    function csvEscape(value) {

        return `"${String(value).replace(/"/g, '""')}"`;
    }


    function resultsToCsv(results) {

        const rows = [];

        rows.push([
            'Type',
            'Name',
            'Flag',
            'Applies to',
            'Date (ISO)',
            'URL'
        ]);


        for (const item of results) {

            rows.push([

                item.itemType,

                item.itemName,

                item.dateKind,

                item.audience,

                item.flaggedDate.toISOString(),

                item.itemUrl
            ]);
        }


        return rows
            .map(row =>
                row
                    .map(csvEscape)
                    .join(',')
            )
            .join('\n');
    }


    function downloadCSV(results) {

        const csv = resultsToCsv(results);


        const blob = new Blob(
            [csv],
            {
                type: 'text/csv;charset=utf-8'
            }
        );


        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;

        link.download =
            `canvas-outdated-due-dates-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
    }

    // ------------------------------------------------------------
    // STYLES
    // ------------------------------------------------------------

    function injectStyles() {

        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = `

            #${MODAL_ID} {
                position: fixed;
                z-index: 999999;
                inset: 0;
                font-family: Arial, sans-serif;
            }


            .canvas-audit-backdrop {

                position: absolute;

                inset: 0;

                background: rgba(0,0,0,.55);

                display: flex;

                justify-content: center;

                align-items: center;

            }


            .canvas-audit-window {

                background: white;

                width: min(1100px, 95vw);

                max-height: 85vh;

                overflow: auto;

                border-radius: 8px;

                box-shadow:
                    0 10px 40px rgba(0,0,0,.4);

            }


            .canvas-audit-header {

                display: flex;

                justify-content: space-between;

                align-items: center;

                padding: 16px 20px;

                border-bottom: 1px solid #ddd;

            }


            .canvas-audit-header h2 {

                margin: 0;

            }


            #canvas-audit-close {

                border: none;

                background: transparent;

                font-size: 30px;

                cursor: pointer;

            }


            .canvas-audit-controls {

                padding: 20px;

                display: flex;

                gap: 15px;

                align-items: center;

                flex-wrap: wrap;

            }


            .canvas-audit-controls input {

                margin-left: 8px;

                padding: 6px;

            }


            .canvas-audit-controls button {

                padding: 8px 14px;

                cursor: pointer;

            }


            .canvas-audit-status {

                padding: 0 20px 15px;

                font-weight: bold;

            }


            .canvas-audit-table {

                width: 100%;

                border-collapse: collapse;

                margin-top: 10px;

            }


            .canvas-audit-table th,
            .canvas-audit-table td {

                border: 1px solid #ddd;

                padding: 10px;

                text-align: left;

            }


            .canvas-audit-table th {

                background: #f3f3f3;

            }


            .canvas-audit-old-date {

                font-weight: bold;

            }


            .canvas-audit-footer {

                padding: 20px;

            }


            #${BUTTON_ID} {

                position: fixed;

                right: 24px;

                bottom: 24px;

                left: auto;

                z-index: 999998;

                padding: 10px 15px;

                border-radius: 6px;

                border: none;

                background: #394b9a;

                color: white;

                font-size: 14px;

                cursor: pointer;

                box-shadow:
                    0 3px 10px rgba(0,0,0,.3);

            }


            #${BUTTON_ID}:hover {

                opacity: .9;

            }

        `;

        document.head.appendChild(style);
    }


    // ------------------------------------------------------------
    // ENDED COURSE HIGHLIGHT
    // ------------------------------------------------------------

    function applyEndedCourseHighlight() {

        if (document.getElementById(ENDED_STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');

        style.id = ENDED_STYLE_ID;

        style.textContent = `

            body {

                background-color: #fff9c4 !important;

            }


            .ic-Layout-wrapper,
            .ic-Layout-contentMain {

                background-color: #fff9c4 !important;

            }

        `;

        document.head.appendChild(style);
    }


    // ------------------------------------------------------------
    // CREATE MODAL
    // ------------------------------------------------------------

    function createModal() {

        injectStyles();

        const modal = document.createElement('div');

        modal.id = MODAL_ID;

        modal.innerHTML = `

            <div class="canvas-audit-backdrop">

                <div class="canvas-audit-window">

                    <div class="canvas-audit-header">

                        <h2>🔎 Canvas Due Date Audit</h2>

                        <button
                            id="canvas-audit-close"
                            title="Close"
                        >
                            ×
                        </button>

                    </div>


                    <div class="canvas-audit-controls">

                        <label>

                            Flag dates before:

                            <input
                                type="date"
                                id="canvas-audit-cutoff"
                            >

                        </label>


                        <button
                            id="canvas-audit-run"
                        >
                            Run audit
                        </button>

                    </div>


                    <div
                        id="canvas-audit-status"
                        class="canvas-audit-status"
                    >
                        Choose a cutoff date and run the audit.
                    </div>


                    <div
                        id="canvas-audit-results"
                    ></div>

                </div>

            </div>
        `;

        document.body.appendChild(modal);


        // Default cutoff: today.

        const cutoffInput =
            modal.querySelector('#canvas-audit-cutoff');


        const today = new Date();

        cutoffInput.value =
            today.toISOString().slice(0, 10);


        // Close button.

        modal
            .querySelector('#canvas-audit-close')
            .addEventListener('click', () => {

                modal.remove();

            });


        // Click outside modal.

        modal
            .querySelector('.canvas-audit-backdrop')
            .addEventListener('click', event => {

                if (
                    event.target.classList.contains(
                        'canvas-audit-backdrop'
                    )
                ) {
                    modal.remove();
                }

            });


        // Run audit.

        modal
            .querySelector('#canvas-audit-run')
            .addEventListener('click', async () => {

                const courseId = getCourseId();


                if (!courseId) {

                    alert(
                        'Could not determine the Canvas course ID.'
                    );

                    return;
                }


                /*
                 * Interpret cutoff as the START of that local date.
                 *
                 * Example:
                 *
                 * cutoff = 2026-09-01
                 *
                 * Anything before
                 * 1 September 2026 00:00
                 *
                 * is flagged.
                 */

                const cutoffDate =
                    parseCutoffLocalDate(cutoffInput.value);


                if (!cutoffDate) {

                    alert(
                        'Please choose a cutoff date.'
                    );

                    return;
                }


                const status =
                    modal.querySelector(
                        '#canvas-audit-status'
                    );


                const resultsDiv =
                    modal.querySelector(
                        '#canvas-audit-results'
                    );


                status.textContent =
                    'Loading data from Canvas…';


                resultsDiv.innerHTML = '';


                try {

                    const [
                        assignments,
                        quizzes,
                        files
                    ] = await Promise.all([
                        getAssignments(courseId),
                        getQuizzes(courseId),
                        getFiles(courseId)
                    ]);


                    const { results, itemCount } = auditCourse(
                        assignments,
                        quizzes,
                        files,
                        cutoffDate,
                        courseId
                    );


                    status.textContent =
                        `Checking ${itemCount} item(s)…`;


                    status.textContent =
                        `Found ${results.length} outdated date(s).`;


                    if (results.length === 0) {

                        resultsDiv.innerHTML = `

                            <div class="canvas-audit-footer">

                                🎉 No due dates or "available from"
                                dates were found before the selected
                                cutoff date.

                            </div>

                        `;

                        return;
                    }


                    let html = `

                        <table
                            class="canvas-audit-table"
                        >

                            <thead>

                                <tr>

                                    <th>Type</th>

                                    <th>Name</th>

                                    <th>Flag</th>

                                    <th>Applies to</th>

                                    <th>Date</th>

                                </tr>

                            </thead>

                            <tbody>

                    `;


                    for (const item of results) {

                        html += `

                            <tr>

                                <td>

                                    ${escapeHtml(
                                        item.itemType
                                    )}

                                </td>


                                <td>

                                    <a
                                        href="${escapeHtml(
                                            item.itemUrl
                                        )}"
                                        target="_blank"
                                    >

                                        ${escapeHtml(
                                            item.itemName
                                        )}

                                    </a>

                                </td>


                                <td
                                    class="canvas-audit-old-date"
                                >

                                    ${escapeHtml(
                                        item.dateKind
                                    )}

                                </td>


                                <td>

                                    ${escapeHtml(
                                        item.audience
                                    )}

                                </td>


                                <td>

                                    ${escapeHtml(
                                        formatDate(
                                            item.dateRaw
                                        )
                                    )}

                                </td>

                            </tr>

                        `;
                    }


                    html += `

                            </tbody>

                        </table>


                        <div
                            class="canvas-audit-footer"
                        >

                            <button
                                id="canvas-audit-download"
                            >

                                Download CSV

                            </button>

                        </div>

                    `;


                    resultsDiv.innerHTML = html;


                    document
                        .querySelector(
                            '#canvas-audit-download'
                        )
                        .addEventListener(
                            'click',
                            () => downloadCSV(results)
                        );


                } catch (error) {

                    console.error(error);


                    status.textContent =
                        'Error while loading data from Canvas.';


                    resultsDiv.innerHTML = `

                        <div
                            class="canvas-audit-footer"
                        >

                            <strong>Error:</strong>

                            ${escapeHtml(error.message)}

                        </div>

                    `;
                }

            });


        return modal;
    }


    // ------------------------------------------------------------
    // CREATE FLOATING BUTTON
    // ------------------------------------------------------------

    function addButton() {

        if (document.getElementById(BUTTON_ID)) {
            return;
        }


        if (!getCourseId()) {
            return;
        }


        injectStyles();


        const button =
            document.createElement('button');


        button.id = BUTTON_ID;

        button.textContent =
            '🔎 Audit due dates';


        button.addEventListener(
            'click',
            () => {

                if (
                    document.getElementById(MODAL_ID)
                ) {
                    return;
                }

                createModal();

            }
        );


        document.body.appendChild(button);
    }

    // ------------------------------------------------------------
    // ENDED COURSE BACKGROUND
    // ------------------------------------------------------------

    async function applyEndedCourseBackground() {

        const courseId = getCourseId();

        if (!courseId) {
            return;
        }

        try {

            const course = await getCourse(courseId);

            let endAt = parseCanvasDate(course.end_at);

            if (!endAt && course.term) {
                endAt = parseCanvasDate(
                    course.term.end_at
                );
                if (!endAt && course.term.name) {
                    endAt = parseTermEndAt(
                        course.term.name
                    );
                }
            }

            if (endAt && endAt < new Date()) {
                applyEndedCourseHighlight();
            }

        } catch (error) {

            console.error(error);
        }
    }


    // ------------------------------------------------------------
    // START
    // ------------------------------------------------------------

    function initialise() {

        setTimeout(
            addButton,
            1000
        );

        applyEndedCourseBackground();
    }


    initialise();

})();
