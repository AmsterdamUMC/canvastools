const { loadModule } = require('./helpers/loaders');

const {
    courseHasEnded,
    parseTermEndAt
} = loadModule('../src/course.js', {
    deps: ['../src/dates.js'],
    exports: ['courseHasEnded', 'parseTermEndAt']
});

describe('course.js', () => {
    describe('courseHasEnded', () => {
        const now = new Date('2026-09-01T12:00:00Z');

        test('returns false when course or end_at is missing', () => {
            expect(courseHasEnded(null, now)).toBe(false);
            expect(courseHasEnded({}, now)).toBe(false);
            expect(courseHasEnded({ end_at: null }, now)).toBe(false);
            expect(courseHasEnded({ end_at: 'not-a-date' }, now)).toBe(false);
        });

        test('returns true when the end date is strictly before now', () => {
            expect(courseHasEnded({ end_at: '2026-08-31T23:59:59Z' }, now)).toBe(true);
        });

        test('returns false when the end date is in the future', () => {
            expect(courseHasEnded({ end_at: '2026-12-01T00:00:00Z' }, now)).toBe(false);
        });

        test('returns false exactly at the end date boundary', () => {
            expect(courseHasEnded({ end_at: '2026-09-01T12:00:00Z' }, now)).toBe(false);
        });
    });

    describe('parseTermEndAt', () => {
        test('returns null for nullish / empty input', () => {
            expect(parseTermEndAt(null)).toBeNull();
            expect(parseTermEndAt(undefined)).toBeNull();
            expect(parseTermEndAt('')).toBeNull();
        });

        test('parses a plain semester 1 name', () => {
            const result = parseTermEndAt('2026/27 Sem. 1');
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(1); // February
            expect(result.getDate()).toBe(1);
        });

        test('parses a plain semester 2 name', () => {
            const result = parseTermEndAt('2026/27 Sem. 2');
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(8); // September
            expect(result.getDate()).toBe(1);
        });

        test('ignores a ", per. 1-2" suffix', () => {
            const result = parseTermEndAt('2026/27 Sem. 1, per. 1-2');
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(1);
            expect(result.getDate()).toBe(1);
        });

        test('handles a 4-digit end year in the term name', () => {
            const result = parseTermEndAt('2026/2027 Sem. 2');
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(8);
            expect(result.getDate()).toBe(1);
        });

        test('returns null for unrecognised names', () => {
            expect(parseTermEndAt('Full Year')).toBeNull();
            expect(parseTermEndAt('2026 Sem. 1')).toBeNull();
        });
    });
});
