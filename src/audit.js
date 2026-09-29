    // ------------------------------------------------------------
    // AUDIT ENTITIES
    // ------------------------------------------------------------

    const DATE_KINDS = [
        { field: 'due_at', label: 'Due date' },
        { field: 'unlock_at', label: 'Available from' }
    ];


    /*
     * Selectable date kinds for the checkboxes in the audit
     * modal. Quiz dates follow the assignment checkboxes,
     * because Canvas models quizzes as assignments (graded
     * quizzes are even de-duplicated against the assignments
     * endpoint).
     */

    const AUDIT_OPTIONS = [
        { key: 'assignmentAvailable', label: 'Assignment available' },
        { key: 'assignmentDue', label: 'Assignment due' },
        { key: 'fileAvailable', label: 'File available' }
    ];


    function normalizeAuditOptions(options) {

        const normalized = {};

        for (const option of AUDIT_OPTIONS) {

            normalized[option.key] =
                !options || options[option.key] !== false;
        }

        return normalized;
    }


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


    /*
     * Determine which Canvas endpoint manages the dates of an
     * audited entity.
     *
     * Quiz-backed assignments come from the assignments
     * endpoint (entity.quiz_id links to the underlying quiz);
     * their dates - including overrides - are updated through
     * the assignment endpoint. Practice quizzes only exist in
     * the quizzes endpoint and have no overrides.
     */

    function updateTarget(entity, type) {

        if (type === 'File') {
            return { endpoint: 'file', entityId: entity.id };
        }

        if (type === 'Quiz' && !entity.quiz_id) {
            return { endpoint: 'quiz', entityId: entity.id };
        }

        return { endpoint: 'assignment', entityId: entity.id };
    }


    function auditEntities(entities, cutoffDate, type, courseId, kindFields) {

        const results = [];

        const kinds = DATE_KINDS.filter(
            kind =>
                !kindFields ||
                kindFields.includes(kind.field)
        );

        if (kinds.length === 0) {
            return results;
        }

        for (const entity of entities) {

            const target = updateTarget(entity, type);

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

                for (const kind of kinds) {

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

                        dateRaw: rawDate,

                        update: {
                            endpoint: target.endpoint,
                            entityId: target.entityId,
                            overrideId:
                                entry.assignment_override_id || null,
                            field: kind.field
                        }
                    });
                }
            }
        }


        results.sort(
            (a, b) => a.flaggedDate - b.flaggedDate
        );

        return results;
    }


    function auditCourse(assignments, quizzes, files, cutoffDate, courseId, options) {

        const selected = normalizeAuditOptions(options);

        const {
            assignmentsToAudit,
            quizzesToAudit,
            filesToAudit
        } = partitionCourseItems(assignments, quizzes, files);

        /*
         * Quizzes follow the assignment checkboxes (see
         * AUDIT_OPTIONS).
         */

        const assignmentFields = [];

        if (selected.assignmentDue) {
            assignmentFields.push('due_at');
        }

        if (selected.assignmentAvailable) {
            assignmentFields.push('unlock_at');
        }

        const fileFields = [];

        if (selected.fileAvailable) {
            fileFields.push('unlock_at');
        }

        const results = [].concat(

            auditEntities(
                assignmentsToAudit,
                cutoffDate,
                'Assignment',
                courseId,
                assignmentFields
            ),

            auditEntities(
                quizzesToAudit,
                cutoffDate,
                'Quiz',
                courseId,
                assignmentFields
            ),

            auditEntities(
                filesToAudit,
                cutoffDate,
                'File',
                courseId,
                fileFields
            )

        ).sort(
            (a, b) =>
                a.flaggedDate - b.flaggedDate
        );

        return {
            results,
            itemCount:
                (assignmentFields.length > 0
                    ? assignmentsToAudit.length +
                      quizzesToAudit.length
                    : 0) +
                (fileFields.length > 0
                    ? filesToAudit.length
                    : 0)
        };
    }

