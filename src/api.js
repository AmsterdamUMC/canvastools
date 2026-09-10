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

