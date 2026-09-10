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
