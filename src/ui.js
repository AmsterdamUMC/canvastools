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


            .canvas-audit-checkboxes {

                display: flex;

                gap: 12px;

                align-items: center;

                flex-wrap: wrap;

            }


            .canvas-audit-checkbox {

                display: inline-flex;

                align-items: center;

                gap: 5px;

                white-space: nowrap;

                cursor: pointer;

            }


            .canvas-audit-checkbox input {

                margin: 0;

                padding: 0;

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


            .canvas-audit-footer button {

                margin-right: 10px;

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


                        <span class="canvas-audit-checkboxes">

                            <label class="canvas-audit-checkbox">

                                <input
                                    type="checkbox"
                                    id="${OPTION_ASSIGNMENT_AVAILABLE_ID}"
                                    checked
                                >

                                Assignment available

                            </label>


                            <label class="canvas-audit-checkbox">

                                <input
                                    type="checkbox"
                                    id="${OPTION_ASSIGNMENT_DUE_ID}"
                                    checked
                                >

                                Assignment due

                            </label>


                            <label class="canvas-audit-checkbox">

                                <input
                                    type="checkbox"
                                    id="${OPTION_FILE_AVAILABLE_ID}"
                                    checked
                                >

                                File available

                            </label>

                        </span>


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


        // Shared state for the results area.

        const status =
            modal.querySelector(
                '#canvas-audit-status'
            );


        const resultsDiv =
            modal.querySelector(
                '#canvas-audit-results'
            );


        let currentResults = [];


        // ------------------------------------------------------------
        // RESULTS RENDERING
        // ------------------------------------------------------------

        function bindResultButtons(results) {

            document
                .querySelector(
                    '#canvas-audit-download'
                )
                .addEventListener(
                    'click',
                    () => downloadCSV(results)
                );

            document
                .querySelector(
                    '#' + MOVE_DATES_BUTTON_ID
                )
                .addEventListener(
                    'click',
                    () => startMoveDates(results)
                );
        }


        function renderResults(results) {

            let html = `

                        <table
                            class="canvas-audit-table"
                        >

                            <thead>

                                <tr>

                                    <th></th>

                                    <th>Type</th>

                                    <th>Name</th>

                                    <th>Flag</th>

                                    <th>Applies to</th>

                                    <th>Date</th>

                                </tr>

                            </thead>

                            <tbody>

                    `;


            let index = 0;

            for (const item of results) {

                html += `

                            <tr>

                                <td>

                                    <input
                                        type="checkbox"
                                        class="${RESULT_SELECT_CLASS}"
                                        data-index="${index}"
                                    >

                                </td>

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

                index++;
            }


            html += `

                            </tbody>

                        </table>

                        <div
                            class="canvas-audit-footer"
                        >

                            <button
                                id="${MOVE_DATES_BUTTON_ID}"
                            >

                                Move dates

                            </button>

                            <button
                                id="canvas-audit-download"
                            >

                                Download CSV

                            </button>

                        </div>

                    `;

            resultsDiv.innerHTML = html;

            bindResultButtons(results);
        }


        // ------------------------------------------------------------
        // MOVE DATES
        // ------------------------------------------------------------

        function promptMondayDate(label) {

            while (true) {

                const value = prompt(
                    label +
                    ' (YYYY-MM-DD, must be a Monday):'
                );

                if (value === null) {
                    return null;
                }

                const date =
                    parseCutoffLocalDate(value.trim());

                if (!date) {

                    alert(
                        'Could not read that date. ' +
                        'Please use YYYY-MM-DD.'
                    );

                    continue;
                }

                if (!isMonday(date)) {

                    alert(
                        'That date is not a Monday.'
                    );

                    continue;
                }

                return date;
            }
        }


        function startMoveDates(results) {

            const checkboxes =
                resultsDiv.querySelectorAll(
                    '.' + RESULT_SELECT_CLASS
                );

            const selected = [];

            checkboxes.forEach(checkbox => {

                if (checkbox.checked) {

                    selected.push(
                        results[
                            Number(
                                checkbox.dataset.index
                            )
                        ]
                    );
                }
            });

            if (selected.length === 0) {

                alert(
                    'Select at least one result first.'
                );

                return;
            }

            const oldStart =
                promptMondayDate(
                    'Enter the old starting date of the course'
                );

            if (!oldStart) {
                return;
            }

            const newStart =
                promptMondayDate(
                    'Enter the new starting date of the course'
                );

            if (!newStart) {
                return;
            }

            const weeks =
                deltaWeeks(oldStart, newStart);

            const proposals = selected.map(
                result => ({
                    ...result,
                    newDate: addWeeks(
                        result.flaggedDate,
                        weeks
                    )
                })
            );

            renderMoveProposal(proposals, weeks);
        }


        function renderMoveProposal(
            proposals,
            weeks
        ) {

            const previousHtml =
                resultsDiv.innerHTML;

            status.textContent =
                `Proposed new dates, shifted by ` +
                `${weeks} week(s). ` +
                'Confirm to update them in Canvas.';

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

                                    <th>Old date</th>

                                    <th>New date</th>

                                </tr>

                            </thead>

                            <tbody>

                    `;

            for (const proposal of proposals) {

                html += `

                            <tr>

                                <td>

                                    ${escapeHtml(
                                        proposal.itemType
                                    )}

                                </td>

                                <td>

                                    ${escapeHtml(
                                        proposal.itemName
                                    )}

                                </td>

                                <td
                                    class="canvas-audit-old-date"
                                >

                                    ${escapeHtml(
                                        proposal.dateKind
                                    )}

                                </td>

                                <td>

                                    ${escapeHtml(
                                        proposal.audience
                                    )}

                                </td>

                                <td>

                                    ${escapeHtml(
                                        formatDate(
                                            proposal.dateRaw
                                        )
                                    )}

                                </td>

                                <td>

                                    ${escapeHtml(
                                        formatDate(
                                            proposal.newDate
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
                                id="${APPLY_MOVES_BUTTON_ID}"
                            >

                                Confirm: update dates in Canvas

                            </button>

                            <button
                                id="${CANCEL_MOVES_BUTTON_ID}"
                            >

                                Cancel

                            </button>

                        </div>

                    `;

            resultsDiv.innerHTML = html;


            document
                .querySelector(
                    '#' + CANCEL_MOVES_BUTTON_ID
                )
                .addEventListener(
                    'click',
                    () => {

                        status.textContent = '';

                        resultsDiv.innerHTML =
                            previousHtml;

                        bindResultButtons(
                            currentResults
                        );
                    }
                );


            document
                .querySelector(
                    '#' + APPLY_MOVES_BUTTON_ID
                )
                .addEventListener(
                    'click',
                    () => applyMoves(proposals, weeks)
                );
        }


        async function applyMoves(proposals, weeks) {

            const courseId = getCourseId();

            const applyButton =
                document.querySelector(
                    '#' + APPLY_MOVES_BUTTON_ID
                );

            const cancelButton =
                document.querySelector(
                    '#' + CANCEL_MOVES_BUTTON_ID
                );

            applyButton.disabled = true;

            cancelButton.disabled = true;

            applyButton.textContent =
                'Updating…';

            let movedCount = 0;

            const failures = [];

            /*
             * One request per Canvas item: each request
             * already shifts all dates of that entry, so a
             * second selected date of the same entry must not
             * shift it again.
             */
            const requests = new Map();

            for (const proposal of proposals) {

                const request = moveRequest(
                    proposal,
                    courseId,
                    weeks
                );

                if (!requests.has(request.url)) {
                    requests.set(request.url, {
                        request,
                        proposals: []
                    });
                }

                requests.get(request.url).proposals.push(proposal);
            }

            for (const { request, proposals: group } of requests.values()) {

                try {

                    await sendDateUpdate(request);

                    movedCount += group.length;

                } catch (error) {

                    console.error(error);

                    failures.push(
                        `${group[0].itemName}: ` +
                        `${error.message}`
                    );
                }
            }

            if (failures.length > 0) {

                alert(
                    `Moved ${movedCount} of ` +
                    `${proposals.length} date(s).` +
                    `\n\nFailed:\n` +
                    failures.join('\n')
                );
            }

            /*
             * Refresh the audit so moved dates
             * disappear from the results.
             */

            await runAudit();
        }


        // ------------------------------------------------------------
        // RUN AUDIT
        // ------------------------------------------------------------

        async function runAudit() {

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


            const options = {
                assignmentAvailable:
                    modal.querySelector(
                        '#' + OPTION_ASSIGNMENT_AVAILABLE_ID
                    ).checked,

                assignmentDue:
                    modal.querySelector(
                        '#' + OPTION_ASSIGNMENT_DUE_ID
                    ).checked,

                fileAvailable:
                    modal.querySelector(
                        '#' + OPTION_FILE_AVAILABLE_ID
                    ).checked
            };


            if (
                !options.assignmentAvailable &&
                !options.assignmentDue &&
                !options.fileAvailable
            ) {

                alert(
                    'Select at least one date type to audit.'
                );

                return;
            }


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
                    courseId,
                    options
                );


                currentResults = results;


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


                renderResults(results);


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
        }


        modal
            .querySelector('#canvas-audit-run')
            .addEventListener('click', runAudit);


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


