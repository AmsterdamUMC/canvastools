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


