"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_extension_tester_1 = require("vscode-extension-tester");
describe('Basic E2E Test', () => {
    it('opens a new untitled editor', async () => {
        const workbench = new vscode_extension_tester_1.Workbench();
        await workbench.openNewUntitledTextDocument();
        const editor = await vscode_extension_tester_1.EditorView.getActiveEditor();
        const text = await editor.getText();
        expect(text).toBe('');
    });
});
//# sourceMappingURL=e2e.test.js.map