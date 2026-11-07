/** Shared theme rules for every extension webview. VS Code updates these variables live. */
export const webviewStyles = `
    body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        font-weight: var(--vscode-font-weight);
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        margin: 20px;
    }
    body.vscode-light, body.vscode-high-contrast-light { color-scheme: light; }
    body.vscode-dark, body.vscode-high-contrast { color-scheme: dark; }
    button, input, textarea, select { font: inherit; box-sizing: border-box; }
    input, textarea {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border, var(--vscode-contrastBorder, transparent));
        padding: 8px;
    }
    input::placeholder, textarea::placeholder {
        color: var(--vscode-input-placeholderForeground);
        opacity: 1;
    }
    .code-area {
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
        font-weight: var(--vscode-editor-font-weight);
        border-color: var(--vscode-input-border, var(--vscode-panel-border));
    }
    button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder, transparent));
        border-radius: 4px;
        cursor: pointer;
    }
    button:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
    button.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground); }
    button:disabled { color: var(--vscode-disabledForeground); cursor: not-allowed; }
    button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 2px;
    }
    select {
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border, var(--vscode-contrastBorder, transparent));
    }
    option { background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); }
    input[type="checkbox"] {
        appearance: none;
        background: var(--vscode-checkbox-background);
        border: 1px solid var(--vscode-checkbox-border, var(--vscode-contrastBorder, var(--vscode-foreground)));
        border-radius: 3px;
        width: 16px;
        height: 16px;
        padding: 0;
        display: inline-grid;
        place-content: center;
        vertical-align: middle;
        cursor: pointer;
    }
    input[type="checkbox"]:checked::before {
        content: "✓";
        color: var(--vscode-checkbox-foreground);
        font-size: 14px;
        line-height: 1;
    }
    ::selection { background: var(--vscode-editor-selectionBackground); }
    a { color: var(--vscode-textLink-foreground); }
    a:hover { color: var(--vscode-textLink-activeForeground); }
    * { scrollbar-color: var(--vscode-scrollbarSlider-background) var(--vscode-editor-background); }
`;
