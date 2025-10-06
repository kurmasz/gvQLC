// increase default test case timeout to 5 seconds
module.exports = {
    timeout: 5317,
    require: [
        'source-map-support/register'
    ]
};

// Mock VS Code module for unit tests
if (process.env.TEST_TYPE === 'unit') {
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
        if (id === 'vscode') {
            return require('./out/src/test/__mocks__/vscode.js');
        }
        return originalRequire.apply(this, arguments);
    };
}
