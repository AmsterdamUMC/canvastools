const { loadModule } = require('./helpers/loaders');

const {
    auditEntities,
    auditCourse,
    isQuizBackedAssignment,
    entityName,
    entityUrl,
    dateEntries,
    audienceLabel,
    partitionCourseItems,
    AUDIT_OPTIONS,
    normalizeAuditOptions
} = loadModule('../src/audit.js', {
    deps: ['../src/dates.js'],
    exports: [
        'auditEntities',
        'auditCourse',
        'isQuizBackedAssignment',
        'entityName',
        'entityUrl',
        'dateEntries',
        'audienceLabel',
        'partitionCourseItems',
        'AUDIT_OPTIONS',
        'normalizeAuditOptions'
    ]
});

const FIXED_COURSE_ID = '12345';

describe('audit.js', () => {
    describe('AUDIT_OPTIONS', () => {
        test('exposes the three selectable date kinds', () => {
            expect(AUDIT_OPTIONS).toEqual([
                { key: 'assignmentAvailable', label: 'Assignment available' },
                { key: 'assignmentDue', label: 'Assignment due' },
                { key: 'fileAvailable', label: 'File available' }
            ]);
        });
    });

    describe('normalizeAuditOptions', () => {
        test('defaults every option to true when options are missing', () => {
            expect(normalizeAuditOptions(undefined)).toEqual({
                assignmentAvailable: true,
                assignmentDue: true,
                fileAvailable: true
            });
            expect(normalizeAuditOptions({})).toEqual({
                assignmentAvailable: true,
                assignmentDue: true,
                fileAvailable: true
            });
        });

        test('keeps explicit false values and defaults the rest', () => {
            expect(normalizeAuditOptions({ assignmentDue: false })).toEqual({
                assignmentAvailable: true,
                assignmentDue: false,
                fileAvailable: true
            });

            expect(normalizeAuditOptions({
                assignmentAvailable: false,
                assignmentDue: false,
                fileAvailable: false
            })).toEqual({
                assignmentAvailable: false,
                assignmentDue: false,
                fileAvailable: false
            });
        });
    });

    describe('isQuizBackedAssignment', () => {
        test('returns true for online_quiz submissions', () => {
            expect(isQuizBackedAssignment({ submission_types: ['online_quiz'] })).toBe(true);
        });

        test('returns false otherwise', () => {
            expect(isQuizBackedAssignment({ submission_types: ['online_text_entry'] })).toBe(false);
            expect(isQuizBackedAssignment({ submission_types: [] })).toBe(false);
            expect(isQuizBackedAssignment({})).toBe(false);
        });
    });

    describe('entityName', () => {
        test('prefers display_name for Files', () => {
            expect(entityName({ display_name: 'Syllabus.pdf' }, 'File')).toBe('Syllabus.pdf');
        });

        test('falls back to name for Quizzes', () => {
            expect(entityName({ title: 'Midterm', name: 'Fallback' }, 'Quiz')).toBe('Midterm');
            expect(entityName({ name: 'Fallback' }, 'Quiz')).toBe('Fallback');
        });

        test('uses name for Assignments', () => {
            expect(entityName({ name: 'Homework 1' }, 'Assignment')).toBe('Homework 1');
        });
    });

    describe('entityUrl', () => {
        test('Files get /courses/:id/files/:id', () => {
            expect(entityUrl({ id: 99 }, 'File', FIXED_COURSE_ID)).toBe('/courses/12345/files/99');
        });

        test('entities with html_url use it directly', () => {
            expect(entityUrl({ id: 1, html_url: '/courses/123/assignments/1' }, 'Assignment', FIXED_COURSE_ID)).toBe('/courses/123/assignments/1');
        });

        test('Quizzes without html_url fall back to /quizzes/:id', () => {
            expect(entityUrl({ id: 10 }, 'Quiz', FIXED_COURSE_ID)).toBe('/courses/12345/quizzes/10');
        });

        test('Assignments without html_url fall back to /assignments/:id', () => {
            expect(entityUrl({ id: 7 }, 'Assignment', FIXED_COURSE_ID)).toBe('/courses/12345/assignments/7');
        });
    });

    describe('dateEntries', () => {
        test('returns all_dates when it is a non-empty array', () => {
            const allDates = [{ title: 'Section A', due_at: '2026-08-01T00:00:00Z' }];
            expect(dateEntries({ all_dates: allDates, due_at: '2026-01-01T00:00:00Z' })).toBe(allDates);
        });

        test('falls back to entity-level dates when all_dates is missing or empty', () => {
            const entity = { due_at: '2026-08-01T00:00:00Z', unlock_at: '2026-07-01T00:00:00Z' };
            expect(dateEntries({ ...entity, all_dates: [] })).toEqual([{
                title: 'Everyone',
                base: true,
                due_at: entity.due_at,
                unlock_at: entity.unlock_at
            }]);
            expect(dateEntries({ ...entity, all_dates: undefined })).toEqual([{
                title: 'Everyone',
                base: true,
                due_at: entity.due_at,
                unlock_at: entity.unlock_at
            }]);
        });
    });

    describe('audienceLabel', () => {
        test('uses Everyone for base entries', () => {
            expect(audienceLabel({ base: true, title: 'Ignored' })).toBe('Everyone');
        });

        test('uses title for named overrides', () => {
            expect(audienceLabel({ title: 'Section A' })).toBe('Section A');
        });

        test('uses Override when only assignment_override_id is present', () => {
            expect(audienceLabel({ assignment_override_id: 99 })).toBe('Override');
        });

        test('uses Differentiated when no identifying fields exist', () => {
            expect(audienceLabel({})).toBe('Differentiated');
        });
    });

    describe('partitionCourseItems', () => {
        test('treats quiz-backed assignments as quizzes and skips matching quiz records', () => {
            const assignments = [
                { id: 1, name: 'Essay', submission_types: ['online_text_entry'] },
                { id: 2, name: 'Graded quiz', submission_types: ['online_quiz'] }
            ];
            const quizzes = [
                { id: 20, title: 'Graded quiz', assignment_id: 2 },
                { id: 21, title: 'Practice quiz' }
            ];
            const files = [{ id: 30, display_name: 'Syllabus.pdf' }];

            const partitioned = partitionCourseItems(assignments, quizzes, files);

            expect(partitioned.assignmentsToAudit.map(item => item.id)).toEqual([1]);
            expect(partitioned.quizzesToAudit.map(item => item.id)).toEqual([2, 21]);
            expect(partitioned.filesToAudit.map(item => item.id)).toEqual([30]);
            expect(partitioned.filesToAudit).not.toBe(files);
        });
    });

    describe('auditEntities', () => {
        const makeCutoff = (iso) => new Date(iso + 'T00:00:00');

        test('returns empty array for empty input', () => {
            expect(auditEntities([], makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID)).toEqual([]);
        });

        test('flags only dates strictly before the cutoff', () => {
            const entities = [
                { name: 'Old', due_at: '2026-08-01T00:00:00Z', unlock_at: null, all_dates: [] },
                { name: 'Future', due_at: '2026-10-01T00:00:00Z', unlock_at: null, all_dates: [] }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID);

            expect(results.map(r => r.itemName)).toEqual(['Old']);
            expect(results[0].dateKind).toBe('Due date');
        });

        test('flags due_at AND unlock_at separately', () => {
            const entities = [
                { name: 'Mixed', due_at: '2026-08-01T00:00:00Z', unlock_at: '2026-08-15T00:00:00Z', all_dates: [] }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID);

            expect(results).toHaveLength(2);
            expect(results.map(r => r.dateKind).sort()).toEqual(['Available from', 'Due date']);
        });

        test('flags only the requested date kinds when kindFields is given', () => {
            const entities = [
                { name: 'Mixed', due_at: '2026-08-01T00:00:00Z', unlock_at: '2026-08-15T00:00:00Z', all_dates: [] }
            ];

            const dueOnly = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID, ['due_at']);
            expect(dueOnly.map(r => r.dateKind)).toEqual(['Due date']);

            const availableOnly = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID, ['unlock_at']);
            expect(availableOnly.map(r => r.dateKind)).toEqual(['Available from']);

            expect(auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID, [])).toEqual([]);
        });

        test('uses all_dates when present', () => {
            const entities = [
                {
                    name: 'Differentiated',
                    all_dates: [
                        { title: 'Section A', base: false, due_at: '2026-08-01T00:00:00Z', unlock_at: null },
                        { title: 'Section B', base: false, due_at: '2026-10-01T00:00:00Z', unlock_at: null }
                    ]
                }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID);

            expect(results).toHaveLength(1);
            expect(results[0].audience).toBe('Section A');
        });

        test('fallback entry uses entity-level dates when all_dates is missing', () => {
            const entities = [
                { name: 'Plain', due_at: '2026-08-01T00:00:00Z', unlock_at: null, all_dates: undefined }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID);

            expect(results).toHaveLength(1);
            expect(results[0].audience).toBe('Everyone');
        });

        test('results are sorted oldest first', () => {
            const entities = [
                { name: 'A', due_at: '2026-09-10T00:00:00Z', unlock_at: null, all_dates: [] },
                { name: 'B', due_at: '2026-08-10T00:00:00Z', unlock_at: null, all_dates: [] },
                { name: 'C', due_at: '2026-09-05T00:00:00Z', unlock_at: null, all_dates: [] }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-20'), 'Assignment', FIXED_COURSE_ID);

            expect(results.map(r => r.itemName)).toEqual(['B', 'C', 'A']);
        });

        test('skips entries with null/undefined dates', () => {
            const entities = [
                { name: 'NoDates', due_at: null, unlock_at: null, all_dates: [] }
            ];

            expect(auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID)).toEqual([]);
        });

        test('attaches update metadata for assignment base dates', () => {
            const entities = [
                { id: 7, name: 'Plain', due_at: '2026-08-01T00:00:00Z', unlock_at: null, all_dates: [] }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID);

            expect(results[0].update).toEqual({
                endpoint: 'assignment',
                entityId: 7,
                overrideId: null,
                field: 'due_at'
            });
        });

        test('attaches the override id for differentiated dates', () => {
            const entities = [
                {
                    id: 8,
                    name: 'Differentiated',
                    all_dates: [
                        {
                            assignment_override_id: 55,
                            title: 'Section A',
                            due_at: '2026-08-01T00:00:00Z',
                            unlock_at: null
                        }
                    ]
                }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Assignment', FIXED_COURSE_ID);

            expect(results[0].update.overrideId).toBe(55);
        });

        test('updates quiz-backed assignments via the assignment endpoint', () => {
            const entities = [
                {
                    id: 9,
                    quiz_id: 90,
                    name: 'Graded quiz',
                    due_at: '2026-08-01T00:00:00Z',
                    unlock_at: null,
                    all_dates: []
                }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Quiz', FIXED_COURSE_ID);

            expect(results[0].update).toEqual({
                endpoint: 'assignment',
                entityId: 9,
                overrideId: null,
                field: 'due_at'
            });
        });

        test('updates practice quizzes via the quiz endpoint', () => {
            const entities = [
                { id: 21, title: 'Practice quiz', due_at: '2026-08-01T00:00:00Z', unlock_at: null }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'Quiz', FIXED_COURSE_ID);

            expect(results[0].update).toEqual({
                endpoint: 'quiz',
                entityId: 21,
                overrideId: null,
                field: 'due_at'
            });
        });

        test('updates files via the file endpoint on unlock_at', () => {
            const entities = [
                { id: 30, display_name: 'Old.pdf', unlock_at: '2026-07-01T00:00:00Z' }
            ];

            const results = auditEntities(entities, makeCutoff('2026-09-01'), 'File', FIXED_COURSE_ID);

            expect(results[0].update).toEqual({
                endpoint: 'file',
                entityId: 30,
                overrideId: null,
                field: 'unlock_at'
            });
        });
    });

    describe('auditCourse', () => {
        const makeCutoff = (iso) => new Date(iso + 'T00:00:00');

        test('de-duplicates graded quizzes and sorts flagged dates across types', () => {
            const assignments = [
                { id: 1, name: 'Essay', submission_types: ['online_upload'], due_at: '2026-08-20T00:00:00Z', unlock_at: null },
                { id: 2, name: 'Graded quiz', submission_types: ['online_quiz'], due_at: '2026-08-10T00:00:00Z', unlock_at: null, html_url: '/courses/12345/assignments/2' }
            ];
            const quizzes = [
                { id: 20, title: 'Graded quiz', assignment_id: 2, due_at: '2026-08-10T00:00:00Z' },
                { id: 21, title: 'Practice quiz', due_at: '2026-08-15T00:00:00Z' }
            ];
            const files = [
                { id: 30, display_name: 'Old.pdf', unlock_at: '2026-07-01T00:00:00Z' }
            ];

            const { results, itemCount } = auditCourse(
                assignments,
                quizzes,
                files,
                makeCutoff('2026-09-01'),
                FIXED_COURSE_ID
            );

            expect(itemCount).toBe(4);
            expect(results.map(item => item.itemName)).toEqual([
                'Old.pdf',
                'Graded quiz',
                'Practice quiz',
                'Essay'
            ]);
            expect(results.map(item => item.itemType)).toEqual([
                'File',
                'Quiz',
                'Quiz',
                'Assignment'
            ]);
        });

        test('audits only the selected date kinds', () => {
            const assignments = [
                { id: 1, name: 'Essay', submission_types: ['online_upload'], due_at: '2026-08-20T00:00:00Z', unlock_at: '2026-08-01T00:00:00Z' }
            ];
            const quizzes = [];
            const files = [
                { id: 30, display_name: 'Old.pdf', unlock_at: '2026-07-01T00:00:00Z' }
            ];

            const onlyFiles = auditCourse(
                assignments,
                quizzes,
                files,
                makeCutoff('2026-09-01'),
                FIXED_COURSE_ID,
                { assignmentDue: false, assignmentAvailable: false, fileAvailable: true }
            );
            expect(onlyFiles.results.map(r => r.itemName)).toEqual(['Old.pdf']);
            expect(onlyFiles.itemCount).toBe(1);

            const onlyAssignmentDue = auditCourse(
                assignments,
                quizzes,
                files,
                makeCutoff('2026-09-01'),
                FIXED_COURSE_ID,
                { assignmentDue: true, assignmentAvailable: false, fileAvailable: false }
            );
            expect(onlyAssignmentDue.results.map(r => [r.itemName, r.dateKind])).toEqual([
                ['Essay', 'Due date']
            ]);
            expect(onlyAssignmentDue.itemCount).toBe(1);

            const nothingSelected = auditCourse(
                assignments,
                quizzes,
                files,
                makeCutoff('2026-09-01'),
                FIXED_COURSE_ID,
                { assignmentDue: false, assignmentAvailable: false, fileAvailable: false }
            );
            expect(nothingSelected.results).toEqual([]);
            expect(nothingSelected.itemCount).toBe(0);
        });

        test('applies the assignment checkboxes to quizzes as well', () => {
            const quizzes = [
                { id: 21, title: 'Practice quiz', due_at: '2026-08-15T00:00:00Z', unlock_at: '2026-08-10T00:00:00Z' }
            ];

            const availableOnly = auditCourse(
                [],
                quizzes,
                [],
                makeCutoff('2026-09-01'),
                FIXED_COURSE_ID,
                { assignmentDue: false, assignmentAvailable: true, fileAvailable: false }
            );

            expect(availableOnly.results.map(r => [r.itemName, r.dateKind])).toEqual([
                ['Practice quiz', 'Available from']
            ]);
            expect(availableOnly.itemCount).toBe(1);
        });
    });
});
