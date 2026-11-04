import * as vscodeMock from './vscode-mock';
const Module = require('module');

const originalRequire = Module.prototype.require;
Module.prototype.require = function (moduleName: string) {
    if (moduleName === 'vscode') {
        return vscodeMock;
    }
    return originalRequire.apply(this, arguments);
};
