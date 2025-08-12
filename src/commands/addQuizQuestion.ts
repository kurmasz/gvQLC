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

import { GVQLC, state, config } from '../gvQLC';

import { extractStudentName } from '../utilities';
import * as Util from '../utilities';

export const addQuizQuestionCommand = vscode.commands.registerCommand('gvqlc.addQuizQuestion', async () => {
    console.log('Begin addQuizQuestion.');
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showErrorMessage('Please select a code snippet to add a personalized question.');
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
      const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/personalizedQuestions.json`);
      const fileContent = await vscode.workspace.fs.readFile(uri);
      const data = JSON.parse(fileContent.toString());
      existingQuestions = data.map((item: { text: string; }) => item.text).filter(Boolean);
    } catch (error) {
      console.log('Could not load existing questions:', error);
    }

    // Function to load existing answers
    const loadExistingAnswers = async () => {
      try {
        const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/quiz_questions_answers.json`);
        const fileContent = await vscode.workspace.fs.readFile(uri);
        return JSON.parse(fileContent.toString());
      } catch (error) {
        return [];
      }
    };

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
        body { font-family: Arial, sans-serif; margin: 20px; }
        textarea { width: 100%; font-size: 14px; margin-bottom: 10px; display: block; }
        button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; margin-right: 10px; }
        button:hover { background: #005a9e; }
        .code-area { width: 100%; height: 120px; font-family: monospace; background: #f4f4f4; padding: 10px; border-radius: 5px; }
        .optional { color: #666; font-style: italic; }
        #suggestions { 
            position: absolute; 
            background: white;
            color: red;
            border: 1px solid #ddd; 
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
            border-bottom: 1px solid #eee;
        }
        .suggestion-item:hover {
            background-color: #f0f0f0;
        }
        #question-container {
            position: relative;
        }
    </style>
</head>
<body>
    <h1>Add a Quiz Question</h1>

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
    
    <button onclick="submitPersonalizedQuestion()">Submit</button>

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
                if (index === activeSuggestionIndex) {
                    item.style.backgroundColor = '#007acc';
                    item.style.color = 'white';
                } else {
                    item.style.backgroundColor = '';
                    item.style.color = '';
                }
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
                alert('Question cannot be empty!');
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
      if (message.type === 'submitQuestion') {
        const submissionRoot = (await config()).submissionRoot;
        const studentName = Util.extractStudentName(editor.document.uri.fsPath, submissionRoot);
        const questionData = {
          filePath: relativePath, // Using relative path here
          range: {
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character },
          },
          text: message.question,
          highlightedCode: message.editedCode,
          excludeFromQuiz: false
        };

        // Save to personalizedQuestions.json
        state.personalizedQuestionsData.push(questionData);
        await Util.saveDataToFile('personalizedQuestions.json', state.personalizedQuestionsData);

        // Save answer to quiz_questions_answers.json if provided
        if (message.answer && message.answer.trim() !== '') {
          try {
            let answersData = await loadExistingAnswers();
            answersData.push({
              questionId: state.personalizedQuestionsData.length - 1,
              questionText: message.question,
              answer: message.answer.trim(),
              studentName: studentName,
              filePath: relativePath, // Using relative path here too
              timestamp: new Date().toISOString(),
              highlightedCode: message.editedCode
            });
            await Util.saveDataToFile('quiz_questions_answers.json', answersData);
            vscode.window.showInformationMessage('Answer saved successfully!');
          } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to save answer: ${error.message}`);
          }
        }

        vscode.window.showInformationMessage('Personalized question added successfully!');
        panel.dispose();
      }
    });
  });
