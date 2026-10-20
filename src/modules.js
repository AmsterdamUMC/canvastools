    // ------------------------------------------------------------
    // MODULES VIEW: AVAILABLE DATES
    // ------------------------------------------------------------

    function isModulesPage(pathname) {

        return /^\/courses\/\d+\/modules\/?$/.test(pathname || '');
    }


    /*
     * Map module items to the availability date of the assignment
     * they point to. Only published assignments with an unlock_at
     * are returned: [{ itemId, unlockAt }].
     */
    function moduleAvailableDates(modules, assignments) {

        const byId = new Map();

        for (const assignment of assignments || []) {

            if (assignment.published && parseCanvasDate(assignment.unlock_at)) {
                byId.set(String(assignment.id), assignment.unlock_at);
            }
        }

        const results = [];

        for (const module of modules || []) {

            for (const item of module.items || []) {

                if (item.type !== 'Assignment') {
                    continue;
                }

                const unlockAt = byId.get(String(item.content_id));

                if (unlockAt) {
                    results.push({ itemId: String(item.id), unlockAt });
                }
            }
        }

        return results;
    }
