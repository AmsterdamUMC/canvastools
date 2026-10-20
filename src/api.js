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


    function modulesUrl(courseId) {

        return (
            `/api/v1/courses/${courseId}/modules` +
            `?per_page=100` +
            `&include[]=items`
        );
    }


    async function getModules(courseId) {

        return await fetchAllPages(modulesUrl(courseId));
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
    // UPDATE DATES IN CANVAS
    // ------------------------------------------------------------

    /*
     * Build the PUT request that moves one flagged date to its
     * new value. result.update comes from auditEntities and
     * records which endpoint, entity and field are involved.
     */

    function dateUpdateRequest(result, courseId, isoDate) {

        const update = result.update;

        const field = update.field;

        if (update.endpoint === 'file') {

            return {
                // Canvas only exposes PUT /api/v1/files/:id (no
                // course-scoped variant) and expects top-level params.
                url: `/api/v1/files/${update.entityId}`,
                body: { unlock_at: isoDate }
            };
        }

        if (update.endpoint === 'quiz') {

            return {
                url: `/api/v1/courses/${courseId}/quizzes/${update.entityId}`,
                body: { [`quiz[${field}]`]: isoDate }
            };
        }

        if (update.overrideId) {

            return {
                url:
                    `/api/v1/courses/${courseId}` +
                    `/assignments/${update.entityId}` +
                    `/overrides/${update.overrideId}`,
                body: { [`assignment_override[${field}]`]: isoDate }
            };
        }

        return {
            url: `/api/v1/courses/${courseId}/assignments/${update.entityId}`,
            body: { [`assignment[${field}]`]: isoDate }
        };
    }


    /*
     * Build the request that shifts a flagged entry by whole
     * weeks. Canvas validates the due date against the
     * availability window ("Due at must be between available
     * dates"), so moving one date alone fails once it crosses
     * the others. All dates of the same entry (result.entryDates)
     * are therefore shifted together in one request. Files only
     * have unlock_at.
     */
    function moveRequest(result, courseId, weeks) {

        const request = dateUpdateRequest(
            result,
            courseId,
            addWeeks(result.flaggedDate, weeks).toISOString()
        );

        if (result.update.endpoint === 'file') {
            return request;
        }

        const dates = result.entryDates || {};

        for (const field of ['unlock_at', 'due_at', 'lock_at']) {

            const date = parseCanvasDate(dates[field]);

            if (!date || field === result.update.field) {
                continue;
            }

            const extra = dateUpdateRequest(
                { update: { ...result.update, field } },
                courseId,
                addWeeks(date, weeks).toISOString()
            );

            Object.assign(request.body, extra.body);
        }

        return request;
    }


    function encodeBody(body) {

        const parts = [];

        for (const key of Object.keys(body)) {

            parts.push(
                `${encodeURIComponent(key)}=` +
                `${encodeURIComponent(body[key])}`
            );
        }

        return parts.join('&');
    }


    /*
     * Canvas rejects state-changing requests without a valid
     * CSRF token with a generic 422 "unprocessable_content".
     * Canvas does not render a csrf-token meta tag; its own
     * frontend reads the (URL-encoded) _csrf_token cookie and
     * sends it as X-CSRF-Token. The vm-based tests have no
     * document, hence the guard.
     */

    function csrfTokenFromCookie(cookieString) {

        const match = (cookieString || '').match(
            /(?:^|;\s*)_csrf_token=([^;]+)/
        );

        return match ? decodeURIComponent(match[1]) : null;
    }


    function csrfToken() {

        if (typeof document === 'undefined') {
            return null;
        }

        const fromCookie = csrfTokenFromCookie(document.cookie);

        if (fromCookie) {
            return fromCookie;
        }

        const meta = document.querySelector(
            'meta[name="csrf-token"]'
        );

        return meta ? meta.content : null;
    }


    async function sendDateUpdate(request, fetchImpl) {

        const doFetch = fetchImpl || fetch;

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        const token = csrfToken();

        if (token) {
            headers['X-CSRF-Token'] = token;
        }

        const response = await doFetch(request.url, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: headers,
            body: encodeBody(request.body)
        });

        if (!response.ok) {

            let detail = '';

            try {
                detail = (await response.text()).slice(0, 300);
            } catch (ignored) {
                // Body unreadable; report the status only.
            }

            throw new Error(
                `Canvas API error: ${response.status} ${response.statusText}` +
                (detail ? ` - ${detail}` : '')
            );
        }

        return response.json();
    }

