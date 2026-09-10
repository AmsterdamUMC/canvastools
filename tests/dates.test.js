const { loadModule } = require('./helpers/loaders');

describe('dates.js', () => {
    const { parseCanvasDate, parseCutoffLocalDate, formatDate, escapeHtml } = loadModule('../src/dates.js', {
        exports: ['parseCanvasDate', 'parseCutoffLocalDate', 'formatDate', 'escapeHtml']
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
});
