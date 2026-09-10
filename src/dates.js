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

