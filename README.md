# gvQLC

# How to use Code Quiz:
To get started with using these commands, press control + shift + p (or command + shift + p on mac) and select one of the above commands. Make sure to first highlight a section of code if you are using the Add Quiz Question command.

In order to utilize the code quiz addon, you have access to two commands:

### gvQLC: Add Quiz Question
Add Quiz Question allows you to highlight a section of student code and create a quiz question, with an optional answer, based on the highlighted section of student code.

Within the Add Quiz Question command, you can highlight part of the code section, and press the copy & paste button to provide code context in the question box.

### gvQLC: View Quiz Question
View Quiz Question lets you view all of the currently created questions from all of your students, allowing you to edit questions in the process.

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
npm run package
```

The command compiles the code, runs the lint checks, and creates `gvqlc-<version>.vsix` in the repository folder.
