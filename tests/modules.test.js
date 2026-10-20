const { loadModule } = require('./helpers/loaders');

const { isModulesPage, moduleAvailableDates } = loadModule('../src/modules.js', {
    deps: ['../src/dates.js'],
    exports: ['isModulesPage', 'moduleAvailableDates']
});

describe('modules.js', () => {
    test('isModulesPage matches only the modules index', () => {
        expect(isModulesPage('/courses/123/modules')).toBe(true);
        expect(isModulesPage('/courses/123/modules/')).toBe(true);
        expect(isModulesPage('/courses/123/modules/items/5')).toBe(false);
        expect(isModulesPage('/courses/123/assignments')).toBe(false);
    });

    test('returns published assignments with an unlock date', () => {
        const modules = [{
            items: [
                { id: 1, type: 'Assignment', content_id: 10 },
                { id: 2, type: 'Assignment', content_id: 11 },
                { id: 3, type: 'Assignment', content_id: 12 },
                { id: 4, type: 'Quiz', content_id: 10 },
                { id: 5, type: 'Assignment', content_id: 99 }
            ]
        }, {}];
        const assignments = [
            { id: 10, published: true, unlock_at: '2026-09-01T08:00:00Z' },
            { id: 11, published: false, unlock_at: '2026-09-01T08:00:00Z' },
            { id: 12, published: true, unlock_at: null }
        ];
        const result = moduleAvailableDates(modules, assignments);
        expect(JSON.parse(JSON.stringify(result))).toEqual([
            { itemId: '1', unlockAt: '2026-09-01T08:00:00Z' }
        ]);
    });
});
