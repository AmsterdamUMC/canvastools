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
    // MODULES VIEW AVAILABLE DATES
    // ------------------------------------------------------------

    async function applyModuleAvailableDates() {

        const courseId = getCourseId();

        if (!courseId) {
            return;
        }

        try {

            const [modules, assignments] = await Promise.all([
                getModules(courseId),
                getAssignments(courseId)
            ]);

            renderModuleAvailableDates(
                moduleAvailableDates(modules, assignments)
            );

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

        if (isModulesPage(window.location.pathname)) {
            applyModuleAvailableDates();
        }
    }


    initialise();

})();
