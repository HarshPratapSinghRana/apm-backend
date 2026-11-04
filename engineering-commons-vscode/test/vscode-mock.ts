// Minimal mock of the vscode API for unit tests
export const window = {
    showInformationMessage: async (msg: string, ...items: string[]) => items[0],
    showErrorMessage: async (msg: string, ...items: string[]) => items[0],
    showWarningMessage: async (msg: string, ...items: string[]) => items[0],
    showInputBox: async (options?: any) => 'mock-input',
    showQuickPick: async (items: any[], options?: any) => items[0],
    showSaveDialog: async (options?: any) => Uri.file(options?.defaultUri?.fsPath || require('path').join(require('os').tmpdir(), 'artifact.zip')),
    withProgress: async (options: any, task: any) => task({ report: () => {} }),
    registerTreeDataProvider: () => ({ dispose: () => {} })
};

export const commands = {
    registerCommand: (command: string, callback: (...args: any[]) => any) => ({
        dispose: () => {}
    }),
    executeCommand: async (command: string, ...args: any[]) => undefined
};

export const workspace = {
    workspaceFolders: [
        {
            uri: { fsPath: process.cwd() },
            name: 'workspace',
            index: 0
        }
    ],
    getConfiguration: (section?: string) => ({
        get: (key: string) => ''
    })
};

export const ProgressLocation = {
    Notification: 15,
    SourceControl: 1,
    Window: 10
};

export const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2
};

export class TreeItem {
    label?: string;
    collapsibleState?: number;
    description?: string;
    tooltip?: string | MarkdownString | any;
    iconPath?: any;
    contextValue?: string;
    command?: any;

    constructor(label: string, collapsibleState?: number) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}

export class MarkdownString {
    public value: string;
    public isTrusted?: boolean;
    public supportHtml?: boolean;

    constructor(value: string = '', supportThemeIcons: boolean = false) {
        this.value = value;
    }

    public appendMarkdown(value: string): MarkdownString {
        this.value += value;
        return this;
    }

    public appendText(value: string): MarkdownString {
        this.value += value;
        return this;
    }
}

export class ThemeIcon {
    id: string;
    constructor(id: string) {
        this.id = id;
    }
}

export class EventEmitter<T> {
    private listeners: ((e: T) => any)[] = [];
    public event = (listener: (e: T) => any) => {
        this.listeners.push(listener);
        return {
            dispose: () => {
                const idx = this.listeners.indexOf(listener);
                if (idx >= 0) this.listeners.splice(idx, 1);
            }
        };
    };
    public fire(data?: T): void {
        for (const listener of this.listeners) {
            listener(data as T);
        }
    }
}

export class Uri {
    public scheme: string;
    public authority: string;
    public path: string;
    public query: string;
    public fragment: string;
    private _rawString?: string;

    public get fsPath(): string {
        return this.path;
    }

    constructor(scheme = '', authority = '', path = '', query = '', fragment = '') {
        this.scheme = scheme;
        this.authority = authority;
        this.path = path;
        this.query = query;
        this.fragment = fragment;
    }

    public static parse(value: string): Uri {
        const u = new Uri();
        u._rawString = value;
        return u;
    }

    public static file(path: string): Uri {
        const u = new Uri('file', '', path);
        u._rawString = `file://${path}`;
        return u;
    }

    public toString(): string {
        return this._rawString || `${this.scheme}://${this.authority}${this.path}${this.query ? '?' + this.query : ''}`;
    }
}
