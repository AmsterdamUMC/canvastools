const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadModule(relativePath, options = {}) {
    const fullPath = path.join(__dirname, '..', relativePath);
    const code = fs.readFileSync(fullPath, 'utf8');
    const deps = (options.deps || []).map(rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
    const context = vm.createContext({
        console, Date, Math, String, Array, Object, Number, Boolean,
        Infinity, NaN, isNaN, parseInt, parseFloat,
        encodeURIComponent, decodeURIComponent,
        JSON, Error, Promise, Intl, URL, Map, Set,
        navigator: options.navigator || { language: 'en-US' },
        ...(options.globals || {})
    });
    const wrapped = [
        '(function() {',
        ...deps,
        code,
        'return {',
        ...options.exports.map(name => `  ${name},`),
        '};',
        '})()'
    ].join('\n');
    return vm.runInContext(wrapped, context);
}

module.exports = { loadModule };
