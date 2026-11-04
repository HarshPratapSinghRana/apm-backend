import * as vscode from 'vscode';

export class ReviewContentProvider implements vscode.TextDocumentContentProvider {
    public static readonly scheme = 'cip-review';

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    public readonly onDidChange = this._onDidChange.event;

    // Cache of documents: key is uri.toString(), value is text content
    private contentCache: Map<string, string> = new Map();

    public setDocumentContent(uri: vscode.Uri, content: string): void {
        this.contentCache.set(uri.toString(), content);
        this._onDidChange.fire(uri);
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this.contentCache.get(uri.toString()) || '';
    }

    public clearCache(): void {
        this.contentCache.clear();
    }
}
