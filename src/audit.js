    // ------------------------------------------------------------
    // AUDIT ENTITIES
    // ------------------------------------------------------------

    const DATE_KINDS = [
        { field: 'due_at', label: 'Due date' },
        { field: 'unlock_at', label: 'Available from' }
    ];


    function isQuizBackedAssignment(assignment) {

        return (
            Array.isArray(assignment.submission_types) &&
            assignment.submission_types.includes('online_quiz')
        );
    }


    function entityName(entity, type) {

        if (type === 'File') {
            return entity.display_name;
        }

        if (type === 'Quiz') {
            return entity.title || entity.name;
        }

        return entity.name;
    }


    function entityUrl(entity, type, courseId) {

        if (type === 'File') {
            return `/courses/${courseId}/files/${entity.id}`;
        }

        if (entity.html_url) {
            return entity.html_url;
        }

        if (type === 'Quiz') {
            return `/courses/${courseId}/quizzes/${entity.id}`;
        }

        return `/courses/${courseId}/assignments/${entity.id}`;
    }


    function dateEntries(entity) {

        if (
            Array.isArray(entity.all_dates) &&
            entity.all_dates.length > 0
        ) {
            return entity.all_dates;
        }

        return [{
            title: 'Everyone',
            base: true,
            due_at: entity.due_at,
            unlock_at: entity.unlock_at
        }];
    }


    function audienceLabel(entry) {

        if (entry.base === true) {
            return 'Everyone';
        }

        if (entry.title) {
            return entry.title;
        }

        if (entry.assignment_override_id) {
            return 'Override';
        }

        return 'Differentiated';
    }


    function partitionCourseItems(assignments, quizzes, files) {

        const assignmentsToAudit = [];
        const quizzesToAudit = [];
        const filesToAudit = files.slice();

        /*
         * Graded quizzes are also returned by the
         * assignments endpoint (submission type
         * online_quiz). Treat those as quizzes and skip
         * the matching quiz entries so nothing is
         * reported twice.
         */

        for (const assignment of assignments) {

            if (isQuizBackedAssignment(assignment)) {
                quizzesToAudit.push(assignment);
            } else {
                assignmentsToAudit.push(assignment);
            }
        }

        for (const quiz of quizzes) {
            if (!quiz.assignment_id) {
                quizzesToAudit.push(quiz);
            }
        }

        return {
            assignmentsToAudit,
            quizzesToAudit,
            filesToAudit
        };
    }


    function auditEntities(entities, cutoffDate, type, courseId) {

        const results = [];

        for (const entity of entities) {

            /*
             * all_dates contains:
             *
             * - Base/"Everyone" dates
             * - Section overrides
             * - Student overrides
             *
             * Quizzes and files normally only expose their own
             * due_at/unlock_at fields, so the fallback covers them.
             */

            const entries = dateEntries(entity);

            for (const entry of entries) {

                const audience = audienceLabel(entry);

                for (const kind of DATE_KINDS) {

                    const rawDate = entry[kind.field];

                    const date = parseCanvasDate(rawDate);

                    if (!date) {
                        continue;
                    }

                    if (date >= cutoffDate) {
                        continue;
                    }

                    results.push({

                        itemType: type,

                        itemName: entityName(entity, type),

                        itemUrl: entityUrl(entity, type, courseId),

                        audience: audience,

                        dateKind: kind.label,

                        flaggedDate: date,

                        dateRaw: rawDate
                    });
                }
            }
        }


        results.sort(
            (a, b) => a.flaggedDate - b.flaggedDate
        );

        return results;
    }


    function auditCourse(assignments, quizzes, files, cutoffDate, courseId) {

        const {
            assignmentsToAudit,
            quizzesToAudit,
            filesToAudit
        } = partitionCourseItems(assignments, quizzes, files);

        const results = [].concat(

            auditEntities(
                assignmentsToAudit,
                cutoffDate,
                'Assignment',
                courseId
            ),

            auditEntities(
                quizzesToAudit,
                cutoffDate,
                'Quiz',
                courseId
            ),

            auditEntities(
                filesToAudit,
                cutoffDate,
                'File',
                courseId
            )

        ).sort(
            (a, b) =>
                a.flaggedDate - b.flaggedDate
        );

        return {
            results,
            itemCount:
                assignmentsToAudit.length +
                quizzesToAudit.length +
                filesToAudit.length
        };
    }

