const { loadModule } = require('./helpers/loaders');

describe('dates.js', () => {
    const {
        parseCanvasDate,
        parseCutoffLocalDate,
        formatDate,
        escapeHtml,
        isMonday,
        addWeeks,
        deltaWeeks
    } = loadModule('../src/dates.js', {
        exports: [
            'parseCanvasDate',
            'parseCutoffLocalDate',
            'formatDate',
            'escapeHtml',
            'isMonday',
            'addWeeks',
            'deltaWeeks'
        ]
    });

    describe('parseCanvasDate', () => {
        test('returns null for nullish / empty input', () => {
            expect(parseCanvasDate(null)).toBeNull();
            expect(parseCanvasDate(undefined)).toBeNull();
            expect(parseCanvasDate('')).toBeNull();
        });

        test('returns null for an invalid date string', () => {
            expect(parseCanvasDate('not-a-date')).toBeNull();
        });

        test('parses a valid ISO-like date string', () => {
            const result = parseCanvasDate('2026-09-01T00:00:00Z');
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe('2026-09-01T00:00:00.000Z');
        });
    });

    describe('parseCutoffLocalDate', () => {
        test('returns null for nullish / empty input', () => {
            expect(parseCutoffLocalDate(null)).toBeNull();
            expect(parseCutoffLocalDate(undefined)).toBeNull();
            expect(parseCutoffLocalDate('')).toBeNull();
        });

        test('returns null for an invalid date value', () => {
            expect(parseCutoffLocalDate('not-a-date')).toBeNull();
        });

        test('parses YYYY-MM-DD as local midnight', () => {
            const result = parseCutoffLocalDate('2026-09-01');
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(8);
            expect(result.getDate()).toBe(1);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
        });
    });

    describe('formatDate', () => {
        test('returns an em-dash for null / invalid input', () => {
            expect(formatDate(null)).toBe('—');
            expect(formatDate('not-a-date')).toBe('—');
        });

        test('returns a formatted string for a valid date', () => {
            const result = formatDate('2026-09-08T14:30:00Z');
            expect(typeof result).toBe('string');
            expect(result).toContain('2026');
            expect(result).toContain('09');
            expect(result).toContain('08');
        });

        test('accepts an explicit locale without using navigator', () => {
            const result = formatDate('2026-09-08T14:30:00Z', 'en-US');
            expect(typeof result).toBe('string');
            expect(result).toContain('2026');
        });
    });

    describe('escapeHtml', () => {
        test('returns empty string for null / undefined', () => {
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });

        test('escapes the five standard HTML entities', () => {
            expect(escapeHtml('&<>\'"')).toBe('&amp;&lt;&gt;&#039;&quot;');
        });

        test('leaves safe text unchanged', () => {
            expect(escapeHtml('Hello World')).toBe('Hello World');
        });
    });

    describe('isMonday', () => {
        // 2026-09-28 is a Monday, 2026-09-29 is a Tuesday.
        test('returns true for a Monday', () => {
            expect(isMonday(parseCutoffLocalDate('2026-09-28'))).toBe(true);
        });

        test('returns false for other weekdays', () => {
            expect(isMonday(parseCutoffLocalDate('2026-09-29'))).toBe(false);
            expect(isMonday(parseCutoffLocalDate('2026-10-04'))).toBe(false);
        });

        test('returns false for null / invalid input', () => {
            expect(isMonday(null)).toBe(false);
            expect(isMonday(new Date('not-a-date'))).toBe(false);
        });
    });

    describe('addWeeks', () => {
        test('shifts a date by whole weeks', () => {
            const result = addWeeks(parseCutoffLocalDate('2026-08-03'), 2);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(7);
            expect(result.getDate()).toBe(17);
        });

        test('keeps the time of day', () => {
            const source = new Date(2026, 7, 3, 14, 45);
            const result = addWeeks(source, 1);
            expect(result.getHours()).toBe(14);
            expect(result.getMinutes()).toBe(45);
        });

        test('supports negative week counts', () => {
            const result = addWeeks(parseCutoffLocalDate('2026-09-28'), -3);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(8);
            expect(result.getDate()).toBe(7);
        });

        test('does not modify the original date', () => {
            const source = parseCutoffLocalDate('2026-08-03');
            addWeeks(source, 5);
            expect(source.getDate()).toBe(3);
        });
    });

    describe('deltaWeeks', () => {
        test('counts whole weeks between two dates', () => {
            const oldStart = parseCutoffLocalDate('2026-08-31');
            const newStart = parseCutoffLocalDate('2026-09-28');
            expect(deltaWeeks(oldStart, newStart)).toBe(4);
        });

        test('is negative when the new start is earlier', () => {
            const oldStart = parseCutoffLocalDate('2026-09-28');
            const newStart = parseCutoffLocalDate('2026-08-31');
            expect(deltaWeeks(oldStart, newStart)).toBe(-4);
        });

        test('rounds to the nearest week', () => {
            const oldStart = parseCutoffLocalDate('2026-08-31');
            const newStart = parseCutoffLocalDate('2026-09-10');
            expect(deltaWeeks(oldStart, newStart)).toBe(1);
        });
    });
});
