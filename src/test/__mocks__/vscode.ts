// Mock implementation of VS Code API for unit testing
export const window = {
    showInformationMessage: () => Promise.resolve(),
    showErrorMessage: () => Promise.resolve(),
    showWarningMessage: () => Promise.resolve(),
    createOutputChannel: () => ({
        appendLine: () => {},
        show: () => {},
        dispose: () => {}
    }),
    createWebviewPanel: () => ({
        dispose: () => {},
        webview: {
            html: '',
            postMessage: () => Promise.resolve()
        }
    })
};

export const commands = {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: () => Promise.resolve()
};

export const workspace = {
    getConfiguration: () => ({
        get: () => undefined,
        update: () => Promise.resolve()
    }),
    workspaceFolders: [],
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    fs: {
        stat: () => Promise.resolve(),
        readFile: () => Promise.resolve(Buffer.from('')),
        writeFile: () => Promise.resolve(),
        readDirectory: () => Promise.resolve([])
    }
};

export const Uri = {
    file: (path: string) => ({ fsPath: path, path }),
    parse: (uri: string) => ({ fsPath: uri, path: uri }),
    joinPath: (...args: any[]) => ({ fsPath: args.join('/'), path: args.join('/') })
};

export const ExtensionContext = {};

export const ExtensionMode = {
    Development: 1,
    Test: 2,
    Production: 3
};

export const ViewColumn = {
    One: 1,
    Two: 2,
    Three: 3
};

export const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64
};
