const { loadModule } = require('./helpers/loaders');

const { csvEscape, resultsToCsv } = loadModule('../src/csv.js', {
    exports: ['csvEscape', 'resultsToCsv']
});

describe('csv.js', () => {
    describe('csvEscape', () => {
        test('wraps values in quotes', () => {
            expect(csvEscape('Hello')).toBe('"Hello"');
        });

        test('doubles embedded quotes', () => {
            expect(csvEscape('Say "hi"')).toBe('"Say ""hi"""');
        });
    });

    describe('resultsToCsv', () => {
        test('emits a header row and one data row per result', () => {
            const csv = resultsToCsv([
                {
                    itemType: 'Assignment',
                    itemName: 'Homework 1',
                    dateKind: 'Due date',
                    audience: 'Everyone',
                    flaggedDate: new Date('2026-08-01T00:00:00Z'),
                    itemUrl: '/courses/1/assignments/2'
                }
            ]);

            const lines = csv.split('\n');
            expect(lines).toHaveLength(2);
            expect(lines[0]).toBe('"Type","Name","Flag","Applies to","Date (ISO)","URL"');
            expect(lines[1]).toBe(
                '"Assignment","Homework 1","Due date","Everyone","2026-08-01T00:00:00.000Z","/courses/1/assignments/2"'
            );
        });

        test('escapes quotes inside item names', () => {
            const csv = resultsToCsv([
                {
                    itemType: 'File',
                    itemName: 'Read "this"',
                    dateKind: 'Available from',
                    audience: 'Everyone',
                    flaggedDate: new Date('2026-07-01T00:00:00Z'),
                    itemUrl: '/courses/1/files/9'
                }
            ]);

            expect(csv.split('\n')[1]).toContain('"Read ""this"""');
        });
    });
});
