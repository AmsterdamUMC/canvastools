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
