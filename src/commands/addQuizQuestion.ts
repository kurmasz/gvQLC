/************************************************************************************
 * 
 * addQuizQuestion.ts
 * 
 * The addQuizQuestion command.
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as path from 'path';
import * as vscode from 'vscode';

import { state, config } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';
import { webviewStyles } from '../webviewStyles';

export const addQuizQuestionCommand = vscode.commands.registerCommand('gvqlc.addQuizQuestion', async () => {
    console.log('Begin addQuizQuestion.');

    if (!Util.loadPersistedData()) {
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('gvQLC: No active editor tab found. (You must have a code snippet selected to add a quiz question.)');
        vscode.window.setStatusBarMessage(
            "gvQLC: No active editor tab. (You must have a code snippet selected to add a quiz question.)",
            7000
        );
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('gvQLC: No code selected. (You must have a code snippet selected to add a quiz question.)');
        return;
    }

    const range = new vscode.Range(selection.start, selection.end);
    let selectedText = editor.document.getText(range);

    // Get workspace root and calculate relative path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const absolutePath = editor.document.uri.fsPath;
    const relativePath = path.relative(workspaceRoot, absolutePath);

    // Get existing questions for suggestions
    let existingQuestions = [];
    try {
        const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${quizQuestionsFileName}`);
        const fileContent = await vscode.workspace.fs.readFile(uri);
        const data = JSON.parse(fileContent.toString());
        existingQuestions = data.data.map((item: { text: string; }) => item.text).filter(Boolean);
    } catch (error) {
        console.log('Could not load existing questions:', error);
    }

    // Create a Webview Panel for adding a personalized question
    const panel = vscode.window.createWebviewPanel(
        'addPersonalizedQuestion',
        'Add Quiz Question',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // HTML content for the Webview
    panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Quiz Question</title>
    <style>
        ${webviewStyles}
        textarea { width: 100%; margin-bottom: 10px; display: block; }
        button { padding: 10px 20px; cursor: pointer; margin-right: 10px; }
        .code-area { width: 100%; height: 120px; padding: 10px; border-radius: 5px; }
        .optional { color: var(--vscode-descriptionForeground); font-style: italic; }
        #suggestions { 
            position: absolute; 
            background: var(--vscode-editorSuggestWidget-background);
            color: var(--vscode-editorSuggestWidget-foreground);
            border: 1px solid var(--vscode-editorSuggestWidget-border, var(--vscode-panel-border));
            max-height: 200px; 
            overflow-y: auto; 
            z-index: 1000;
            display: none;
            width: 100%;
            box-sizing: border-box;
        }
        .suggestion-item {
            padding: 8px;
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-editorSuggestWidget-border, var(--vscode-panel-border));
        }
        .suggestion-item:hover {
            background: var(--vscode-list-hoverBackground);
            color: var(--vscode-list-hoverForeground, var(--vscode-editorSuggestWidget-foreground));
        }
        .suggestion-item.active {
            background: var(--vscode-editorSuggestWidget-selectedBackground);
            color: var(--vscode-editorSuggestWidget-selectedForeground);
            outline: 1px solid var(--vscode-contrastActiveBorder, transparent);
            outline-offset: -1px;
        }
        #question-container {
            position: relative;
        }
    </style>
</head>
<body>
    <h1 id='addQuizQuestionTitle'>Add a Quiz Question</h1>

    <p><strong>Edit Highlighted Code:</strong></p>
    <textarea id="codeBlock" class="code-area">${selectedText}</textarea>
    <button onclick="copyAndPasteCode()">Copy & Paste Code</button>
    
    <div id="question-container">
        <p><strong>Add Your Question:</strong></p>
        <textarea id="question" placeholder="Type your personalized question here..." rows="4"></textarea>
        <div id="suggestions"></div>
    </div>
    
    <p><strong>Add Answer (Optional):</strong></p>
    <textarea id="answer" placeholder="Type the answer to your question (optional)..." rows="4"></textarea>
    
    <button id="submitButton" onclick="submitPersonalizedQuestion()">Submit</button>

    <script>
        const vscode = acquireVsCodeApi();
        const existingQuestions = ${JSON.stringify(existingQuestions)};
        let currentInput = '';
        let activeSuggestionIndex = -1;

        // Setup question textarea event listeners
        const questionInput = document.getElementById('question');
        const suggestionsContainer = document.getElementById('suggestions');

        questionInput.addEventListener('input', function(e) {
            currentInput = e.target.value.toLowerCase();
            showSuggestions();
        });

        questionInput.addEventListener('keydown', function(e) {
            const suggestions = document.querySelectorAll('.suggestion-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, suggestions.length - 1);
                highlightSuggestion();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, -1);
                highlightSuggestion();
            } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                e.preventDefault();
                selectSuggestion(suggestions[activeSuggestionIndex]);
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });

        function showSuggestions() {
            if (!currentInput) {
                hideSuggestions();
                return;
            }

            const filtered = existingQuestions.filter(q => 
                q && q.toLowerCase().includes(currentInput))
                .slice(0, 5);

            if (filtered.length === 0) {
                hideSuggestions();
                return;
            }

            suggestionsContainer.innerHTML = filtered.map(q => {
                const escapedText = q.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return \`<div class="suggestion-item">\${escapedText}</div>\`;
            }).join('');

            document.querySelectorAll('.suggestion-item').forEach((item, index) => {
                item.addEventListener('click', () => selectSuggestion(item));
            });

            suggestionsContainer.style.display = 'block';
            activeSuggestionIndex = -1;
        }

        function hideSuggestions() {
            suggestionsContainer.style.display = 'none';
            activeSuggestionIndex = -1;
        }

        function highlightSuggestion() {
            const suggestions = document.querySelectorAll('.suggestion-item');
            suggestions.forEach((item, index) => {
                item.classList.toggle('active', index === activeSuggestionIndex);
            });
        }

        function selectSuggestion(suggestionElement) {
            questionInput.value = suggestionElement.textContent;
            hideSuggestions();
            questionInput.focus();
        }

        function copyAndPasteCode() {
            const codeTextArea = document.getElementById('codeBlock');
            const questionArea = document.getElementById('question');
            const existingContent = questionArea.value.trim();
            
            const selectedCode = codeTextArea.value.substring(
                codeTextArea.selectionStart,
                codeTextArea.selectionEnd
            );
            
            const codeToInsert = selectedCode || codeTextArea.value;
            const formattedCode = \`~~~\\n\${codeToInsert}\\n~~~\`;

            if (existingContent) {
                questionArea.value = existingContent + "\\n\\n" + formattedCode;
            } else {
                questionArea.value = formattedCode;
            }
        }

        function submitPersonalizedQuestion() {
            const question = document.getElementById('question').value;
            const answer = document.getElementById('answer').value;
            const editedCode = document.getElementById('codeBlock').value;
            
            if (question.trim() === '') {
                vscode.postMessage({ type: 'showErrorMessage', message: 'Question cannot be empty!' });
                return;
            }

            vscode.postMessage({ 
                type: 'submitQuestion', 
                question, 
                answer, 
                editedCode 
            });
        }
    </script>
</body>
</html>
    `;

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'showErrorMessage') {
            vscode.window.showErrorMessage(message.message);
            return;
        }
        if (message.type === 'submitQuestion') {
           
            
            const questionData = {
                filePath: relativePath, // Using relative path here
                range: {
                    start: { line: selection.start.line, character: selection.start.character },
                    end: { line: selection.end.line, character: selection.end.character },
                },
                text: message.question,
                highlightedCode: message.editedCode,
                answer: message.answer,
                excludeFromQuiz: false
            };

            // Save to personalizedQuestions.json
            state.personalizedQuestionsData.push(questionData);
            await Util.saveDataToFile(quizQuestionsFileName, state.personalizedQuestionsData);

            vscode.window.showInformationMessage('Question added successfully.');
            panel.dispose();
        }
    });
});
