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
                url: `/api/v1/courses/${courseId}/files/${update.entityId}`,
                body: { 'file[unlock_at]': isoDate }
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
     * Canvas rejects state-changing requests without the CSRF
     * token embedded in the page. api.js runs in the page
     * context, so the meta tag is readable. The vm-based tests
     * have no document, hence the guard.
     */

    function csrfToken() {

        if (typeof document === 'undefined') {
            return null;
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
            throw new Error(
                `Canvas API error: ${response.status} ${response.statusText}`
            );
        }

        return response.json();
    }

