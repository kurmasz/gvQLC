# gvQLC

## Set up development environment

1. Install Node.js 24 with npm and VS Code 1.101 or later.
2. Install the dependencies from the repository folder:

    ```sh
   npm ci
    ```

3. Open the folder in VS Code. Press F5 to start the extension in a development window.

## Build VSIX file

Run this command from the repository folder:

```sh
npx @vscode/vsce package
```

The command compiles the code, runs the lint checks, and creates `gvqlc-<version>.vsix` in the repository folder.
