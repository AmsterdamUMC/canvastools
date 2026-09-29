const { loadModule } = require('./helpers/loaders');

const {
    parseCourseId,
    nextUrlFromLinkHeader,
    fetchAllPages,
    courseUrl,
    getCourse,
    assignmentsUrl,
    quizzesUrl,
    filesUrl,
    dateUpdateRequest,
    encodeBody,
    sendDateUpdate
} = loadModule('../src/api.js', {
    exports: [
        'parseCourseId',
        'nextUrlFromLinkHeader',
        'fetchAllPages',
        'courseUrl',
        'getCourse',
        'assignmentsUrl',
        'quizzesUrl',
        'filesUrl',
        'dateUpdateRequest',
        'encodeBody',
        'sendDateUpdate'
    ]
});

describe('api.js', () => {
    describe('parseCourseId', () => {
        test('extracts the numeric course id from a Canvas path', () => {
            expect(parseCourseId('/courses/12345')).toBe('12345');
            expect(parseCourseId('/courses/12345/assignments/9')).toBe('12345');
        });

        test('returns null when no course id is present', () => {
            expect(parseCourseId('/users/1')).toBeNull();
            expect(parseCourseId('/courses/abc')).toBeNull();
            expect(parseCourseId('')).toBeNull();
        });
    });

    describe('nextUrlFromLinkHeader', () => {
        test('returns null for missing or empty headers', () => {
            expect(nextUrlFromLinkHeader(null)).toBeNull();
            expect(nextUrlFromLinkHeader('')).toBeNull();
        });

        test('returns the rel=next URL when present', () => {
            const header = [
                '<https://canvas.uva.nl/api/v1/courses/1/assignments?page=1&per_page=100>; rel="current"',
                '<https://canvas.uva.nl/api/v1/courses/1/assignments?page=2&per_page=100>; rel="next"',
                '<https://canvas.uva.nl/api/v1/courses/1/assignments?page=1&per_page=100>; rel="first"'
            ].join(', ');

            expect(nextUrlFromLinkHeader(header)).toBe(
                'https://canvas.uva.nl/api/v1/courses/1/assignments?page=2&per_page=100'
            );
        });

        test('returns null when no next link exists', () => {
            const header = '<https://canvas.uva.nl/api/v1/courses/1/assignments?page=1>; rel="first"';
            expect(nextUrlFromLinkHeader(header)).toBeNull();
        });
    });

    describe('course endpoint', () => {
        test('courseUrl includes the term', () => {
            expect(courseUrl('99')).toBe(
                '/api/v1/courses/99?include[]=term'
            );
        });

        test('getCourse returns parsed course JSON', async () => {
            const course = {
                id: 99,
                end_at: '2026-06-30T22:00:00Z',
                term: { name: '2026/27 Sem. 1', end_at: '2027-02-01T00:00:00Z' }
            };
            const fetchImpl = jest.fn(async () => ({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => course
            }));

            await expect(getCourse('99', fetchImpl)).resolves.toBe(course);
            expect(fetchImpl).toHaveBeenCalledWith(
                '/api/v1/courses/99?include[]=term',
                { credentials: 'same-origin' }
            );
        });

        test('getCourse throws on a non-OK response', async () => {
            const fetchImpl = jest.fn(async () => ({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({})
            }));

            await expect(getCourse('99', fetchImpl)).rejects.toThrow(
                'Canvas API error: 404 Not Found'
            );
        });
    });

    describe('collection URLs', () => {
        test('assignments URL includes pagination and date includes', () => {
            expect(assignmentsUrl('99')).toBe(
                '/api/v1/courses/99/assignments?per_page=100&include[]=all_dates&include[]=overrides'
            );
        });

        test('quizzes and files URLs include pagination only', () => {
            expect(quizzesUrl('99')).toBe('/api/v1/courses/99/quizzes?per_page=100');
            expect(filesUrl('99')).toBe('/api/v1/courses/99/files?per_page=100');
        });
    });

    describe('fetchAllPages', () => {
        function jsonResponse(body, options = {}) {
            return {
                ok: options.ok !== false,
                status: options.status || 200,
                statusText: options.statusText || 'OK',
                json: async () => body,
                headers: {
                    get: (name) => (name === 'Link' ? options.link || null : null)
                }
            };
        }

        test('follows rel=next until it is exhausted', async () => {
            const pages = {
                '/page/1': jsonResponse([{ id: 1 }], {
                    link: '</page/2>; rel="next"'
                }),
                '/page/2': jsonResponse([{ id: 2 }])
            };
            const fetchImpl = jest.fn(async (url) => pages[url]);

            await expect(fetchAllPages('/page/1', fetchImpl)).resolves.toEqual([
                { id: 1 },
                { id: 2 }
            ]);
            expect(fetchImpl).toHaveBeenCalledTimes(2);
            expect(fetchImpl).toHaveBeenNthCalledWith(1, '/page/1', { credentials: 'same-origin' });
            expect(fetchImpl).toHaveBeenNthCalledWith(2, '/page/2', { credentials: 'same-origin' });
        });

        test('throws on a non-OK response', async () => {
            const fetchImpl = jest.fn(async () => jsonResponse([], {
                ok: false,
                status: 403,
                statusText: 'Forbidden'
            }));

            await expect(fetchAllPages('/page/1', fetchImpl)).rejects.toThrow(
                'Canvas API error: 403 Forbidden'
            );
        });
    });

    describe('dateUpdateRequest', () => {
        test('builds an assignment request for base dates', () => {
            const result = {
                update: { endpoint: 'assignment', entityId: 7, overrideId: null, field: 'due_at' }
            };

            expect(dateUpdateRequest(result, '99', '2026-10-12T08:00:00.000Z')).toEqual({
                url: '/api/v1/courses/99/assignments/7',
                body: { 'assignment[due_at]': '2026-10-12T08:00:00.000Z' }
            });
        });

        test('builds an override request for differentiated dates', () => {
            const result = {
                update: { endpoint: 'assignment', entityId: 8, overrideId: 55, field: 'unlock_at' }
            };

            expect(dateUpdateRequest(result, '99', '2026-10-12T08:00:00.000Z')).toEqual({
                url: '/api/v1/courses/99/assignments/8/overrides/55',
                body: { 'assignment_override[unlock_at]': '2026-10-12T08:00:00.000Z' }
            });
        });

        test('builds a quiz request for practice quizzes', () => {
            const result = {
                update: { endpoint: 'quiz', entityId: 21, overrideId: null, field: 'due_at' }
            };

            expect(dateUpdateRequest(result, '99', '2026-10-12T08:00:00.000Z')).toEqual({
                url: '/api/v1/courses/99/quizzes/21',
                body: { 'quiz[due_at]': '2026-10-12T08:00:00.000Z' }
            });
        });

        test('builds a file request on unlock_at', () => {
            const result = {
                update: { endpoint: 'file', entityId: 30, overrideId: null, field: 'unlock_at' }
            };

            expect(dateUpdateRequest(result, '99', '2026-10-12T08:00:00.000Z')).toEqual({
                url: '/api/v1/courses/99/files/30',
                body: { 'file[unlock_at]': '2026-10-12T08:00:00.000Z' }
            });
        });
    });

    describe('encodeBody', () => {
        test('URL-encodes the flat form fields', () => {
            expect(encodeBody({ 'assignment[due_at]': '2026-10-12T08:00:00.000Z' })).toBe(
                'assignment%5Bdue_at%5D=2026-10-12T08%3A00%3A00.000Z'
            );
        });
    });

    describe('sendDateUpdate', () => {
        function jsonResponse(body, options = {}) {
            return {
                ok: options.ok !== false,
                status: options.status || 200,
                statusText: options.statusText || 'OK',
                json: async () => body
            };
        }

        test('sends a PUT with encoded body and same-origin credentials', async () => {
            const fetchImpl = jest.fn(async () => jsonResponse({ id: 7 }));

            const request = {
                url: '/api/v1/courses/99/assignments/7',
                body: { 'assignment[due_at]': '2026-10-12T08:00:00.000Z' }
            };

            const response = await sendDateUpdate(request, fetchImpl);

            await expect(Promise.resolve(response)).resolves.toEqual({ id: 7 });
            expect(fetchImpl).toHaveBeenCalledWith(
                '/api/v1/courses/99/assignments/7',
                {
                    method: 'PUT',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'assignment%5Bdue_at%5D=2026-10-12T08%3A00%3A00.000Z'
                }
            );
        });

        test('throws on a non-OK response', async () => {
            const fetchImpl = jest.fn(async () => jsonResponse({}, {
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            }));

            await expect(
                sendDateUpdate({ url: '/x', body: {} }, fetchImpl)
            ).rejects.toThrow('Canvas API error: 401 Unauthorized');
        });
    });
});
