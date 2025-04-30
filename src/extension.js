// Extension entry point
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // For generating unique UUIDs

// In-memory storage for comments and questions
const commentsData = [];
const questionsData = [];
let personalizedQuestionsData = [];

// Helper function to get the workspace directory
function getWorkspaceDirectory() {
  if (vscode.workspace.workspaceFolders) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  } else {
    vscode.window.showErrorMessage("No workspace folder is open.");
    throw new Error("Workspace folder is required to save data.");
  }
}

// Helper function to save data to a file in the workspace directory
function saveDataToFile(fileName, data) {
  const workspaceDir = getWorkspaceDirectory();
  const filePath = path.join(workspaceDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Helper function to load data from a file in the workspace directory
function loadDataFromFile(fileName) {
  const workspaceDir = getWorkspaceDirectory();
  const filePath = path.join(workspaceDir, fileName);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return [];
}

// Helper function to ensure personalizedQuestions.json is added to .gitignore
function ensureGitIgnoreForPersonalizedQuestions() {
  const workspaceDir = getWorkspaceDirectory();
  const gitignorePath = path.join(workspaceDir, ".gitignore");
  const personalizedQuestionsFile = "personalizedQuestions.json";

  let gitignoreContent = "";

  // Check if .gitignore exists
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

    // If personalizedQuestions.json is not already in .gitignore, add it
    if (!gitignoreContent.split("\n").includes(personalizedQuestionsFile)) {
      gitignoreContent += `\n${personalizedQuestionsFile}\n`;
      fs.writeFileSync(gitignorePath, gitignoreContent);
    }
  } else {
    // Create a .gitignore file and add personalizedQuestions.json
    fs.writeFileSync(gitignorePath, `${personalizedQuestionsFile}\n`);
  }
}


function extractStudentName(filePath, config) {
  const parts = filePath.split(path.sep);
  let studentName = 'unknown_user';

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].toLowerCase().startsWith('cis')) {
      studentName = parts[i + 1];
      break;
    }
  }

  if (config && config.studentNameMapping) {
    if (config.studentNameMapping[studentName]) {
      studentName = config.studentNameMapping[studentName];
    }
  }

  return studentName;
}





function generateQuestionHTML(questionData, language) {
  return `<pl-question-panel>
<markdown>
${questionData.text.trim()}
</markdown>
<pl-code language="${language}">
${questionData.highlightedCode.trim()}
</pl-code>
</pl-question-panel>
<pl-rich-text-editor file-name="answer.rtf"></pl-rich-text-editor>`;
}

// Helper function to generate info.json content
function generateInfoJSON(title, topic) {
  return {
    uuid: uuidv4(),
    type: "v3",
    gradingMethod: "Manual",
    title,
    topic
  };
}

/**
 * Activate the extension
 * @param {vscode.ExtensionContext} context 
 */
function activate(context) {
  // Load persisted data
  commentsData.push(...loadDataFromFile('commentsData.json'));
  questionsData.push(...loadDataFromFile('questionsData.json'));
  personalizedQuestionsData.push(...loadDataFromFile('personalizedQuestions.json'));

  // Ensure personalizedQuestions.json is in .gitignore
  ensureGitIgnoreForPersonalizedQuestions();

  // Command: Highlight code and add a comment
  let highlightAndCommentCommand = vscode.commands.registerCommand('extension.highlightAndComment', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showErrorMessage('Please select a code snippet to comment on.');
      return;
    }

    const range = new vscode.Range(selection.start, selection.end);
    const selectedText = editor.document.getText(range);

    // Create a Webview Panel for adding a comment
    const panel = vscode.window.createWebviewPanel(
      'addComment', // Panel ID
      'Add Comment', // Panel title
      vscode.ViewColumn.One, // Show in the active column
      { enableScripts: true } // Allow JavaScript in the Webview
    );

    // HTML content for the Webview
    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Add Comment</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          textarea { width: 100%; height: 100px; font-size: 14px; margin-bottom: 10px; }
          button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
          button:hover { background: #005a9e; }
        </style>
      </head>
      <body>
        <h1>Add a Comment</h1>
        <p><strong>Selected Code:</strong></p>
        <pre>${selectedText}</pre>
        <textarea id="comment" placeholder="Write your comment here..."></textarea>
        <button onclick="submitComment()">Submit Comment</button>
        <script>
          const vscode = acquireVsCodeApi();
          function submitComment() {
            const comment = document.getElementById('comment').value;
            if (comment.trim() === '') {
              alert('Comment cannot be empty!');
              return;
            }
            vscode.postMessage({ comment });
          }
        </script>
      </body>
      </html>
    `;

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage((message) => {
      if (message.comment) {
        // Save the comment
        commentsData.push({
          filePath: editor.document.uri.fsPath,
          range: {
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character },
          },
          text: message.comment,
          highlightedCode: selectedText, // Save the highlighted code
          replies: [],
          resolved: false, // Add resolved field
        });

        // Persist data
        saveDataToFile('commentsData.json', commentsData);

        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: 'rgba(144,238,144,0.5)', // Light green highlight
        });
        editor.setDecorations(decorationType, [range]);

        vscode.window.showInformationMessage('Comment added successfully!');
        panel.dispose();
      }
    });
  });

  // Command: View comments
  let viewCommentsCommand = vscode.commands.registerCommand('extension.viewComments', async () => {
    if (commentsData.length === 0) {
      vscode.window.showInformationMessage('No comments added yet!');
      return;
    }

    const truncateCharacters = (text, charLimit) => {
      return text.length > charLimit ? text.slice(0, charLimit) + '...' : text;
    };

    // Create a Webview Panel for viewing comments
    const panel = vscode.window.createWebviewPanel(
      'viewComments', // Panel ID
      'View Comments', // Panel title
      vscode.ViewColumn.One, // Show in the active column
      { enableScripts: true } // Allow JavaScript in the Webview
    );

    // Build a table with all the comments
    const commentsTable = commentsData.map((comment, index) => {
      const range = `${comment.range.start.line}:${comment.range.start.character} - ${comment.range.end.line}:${comment.range.end.character}`;

      // Extract only the last two parts of the file path for display
      const filePathParts = comment.filePath.split('/');
      let shortenedFilePath = filePathParts.length > 2
        ? `.../${filePathParts.slice(-3).join('/')}`
        : comment.filePath;
      shortenedFilePath = truncateCharacters(shortenedFilePath, 30);

      return `
        <tr>
            <td>${index + 1}</td>
            <td title="${comment.filePath}">${shortenedFilePath}</td>
            <td><pre><code class="language-javascript">${comment.highlightedCode || 'No highlighted code'}</code></pre></td>
            <td>${comment.text || 'No text'}</td>
            <td>
                ${comment.resolved ? 'Resolved' : `<button onclick="resolveComment(${index})">Resolve</button>`}
            </td>
        </tr>
        `;
    }).join('');

    // HTML content for the Webview
    panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>View Comments</title>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
            <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                th { background-color: #007acc; color: white; }
                pre { background-color: rgb(0, 0, 0); padding: 5px; border-radius: 5px; color: white; }
                code { font-family: "Fira Code", monospace; font-size: 14px; }
            </style>
        </head>
        <body>
            <h1>All Comments</h1>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File</th>
                        <th>Highlighted Code</th>
                        <th>Comment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${commentsTable}
                </tbody>
            </table>
            <script>
                const vscode = acquireVsCodeApi();

                function resolveComment(index) {
                    vscode.postMessage({ command: 'resolve', index });
                }
            </script>
        </body>
        </html>
    `;

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage((message) => {
      if (message.command === 'resolve') {
        commentsData[message.index].resolved = true;
        saveDataToFile('commentsData.json', commentsData);

        const truncateCharacters = (text, charLimit) => {
          return text.length > charLimit ? text.slice(0, charLimit) + '...' : text;
        };

        // Refresh Webview
        const updatedCommentsTable = commentsData.map((comment, index) => {
          const range = `${comment.range.start.line}:${comment.range.start.character} - ${comment.range.end.line}:${comment.range.end.character}`;

          const filePathParts = comment.filePath.split('/');
          let shortenedFilePath = filePathParts.length > 2
            ? `.../${filePathParts.slice(-3).join('/')}`
            : comment.filePath;
          shortenedFilePath = truncateCharacters(shortenedFilePath, 30);

          return `
                <tr>
                    <td>${index + 1}</td>
                    <td title="${comment.filePath}">${shortenedFilePath}</td>
                    <td><pre><code class="language-javascript">${comment.highlightedCode || 'No highlighted code'}</code></pre></td>
                    <td>${comment.text || 'No text'}</td>
                    <td>
                        ${comment.resolved ? 'Resolved' : `<button onclick="resolveComment(${index})">Resolve</button>`}
                    </td>
                </tr>
                `;
        }).join('');
        panel.webview.html = panel.webview.html.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>${updatedCommentsTable}</tbody>`);
      }
    });
  });


  // Helper function to get the base workspace directory (CIS500_P1)
  function getBaseWorkspaceDirectory() {
    if (vscode.workspace.workspaceFolders) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    } else {
      vscode.window.showErrorMessage("No workspace folder is open.");
      throw new Error("Workspace folder is required to save data.");
    }
  }

  // Helper function to get student directory from file path
  function getStudentDirectory(filePath) {
    const parts = filePath.split(path.sep);
    const baseDir = getBaseWorkspaceDirectory();
    const baseParts = baseDir.split(path.sep);

    // Find the index where the student name should be (right after base directory)
    const studentIndex = baseParts.length;
    if (parts.length > studentIndex) {
      return path.join(baseDir, parts[studentIndex]);
    }
    return null;
  }

  // Modified save functions
  function saveQuestionData(questionData, filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(questionData, null, 2));
  }

  function loadQuestionData(filePath) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return [];
  }

  // Command: Ask a question
  let askQuestionCommand = vscode.commands.registerCommand('extension.askQuestion', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showErrorMessage('Please select a code snippet to ask a question about.');
      return;
    }

    const range = new vscode.Range(selection.start, selection.end);
    const selectedText = editor.document.getText(range);
    const filePath = editor.document.uri.fsPath;

    // Create a Webview Panel for asking a question
    const panel = vscode.window.createWebviewPanel(
      'askQuestion',
      'Ask Question',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ask Question</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      textarea { width: 100%; height: 80px; font-size: 14px; margin-bottom: 10px; }
      button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
      button:hover { background: #005a9e; }
    </style>
  </head>
  <body>
    <h1>Ask a Question</h1>
    <p><strong>Selected Code:</strong></p>
    <pre>${selectedText}</pre>
    <textarea id="question" placeholder="Type your question here..."></textarea>
    <button onclick="submitQuestion()">Submit Question</button>
    <script>
      const vscode = acquireVsCodeApi();
      function submitQuestion() {
        const question = document.getElementById('question').value;
        if (question.trim() === '') {
          alert('Question cannot be empty!');
          return;
        }
        vscode.postMessage({ question });
      }
    </script>
  </body>
  </html>
  `;

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.question) {
        const baseDir = getBaseWorkspaceDirectory();
        const studentDir = getStudentDirectory(filePath);

        const newQuestion = {
          filePath,
          range: {
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character }
          },
          text: message.question,
          highlightedCode: selectedText,
          answer: '',
          timestamp: new Date().toISOString()
        };

        try {
          // Save to global questions file
          const globalQuestionsPath = path.join(baseDir, 'questionsData.json');
          const globalQuestions = loadQuestionData(globalQuestionsPath);
          globalQuestions.push(newQuestion);
          saveQuestionData(globalQuestions, globalQuestionsPath);

          // Save to student-specific questions file if student directory exists
          if (studentDir) {
            const studentQuestionsPath = path.join(studentDir, 'questionsData.json');
            const studentQuestions = loadQuestionData(studentQuestionsPath);
            studentQuestions.push(newQuestion);
            saveQuestionData(studentQuestions, studentQuestionsPath);
          }

          // Update in-memory data
          questionsData.push(newQuestion);

          vscode.window.showInformationMessage('Question added successfully!');
          panel.dispose();
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to save question: ${error.message}`);
        }
      }
    });
  });

  // Command: Answer a question
  let answerQuestionCommand = vscode.commands.registerCommand('extension.answerQuestion', async () => {
    if (questionsData.length === 0) {
      vscode.window.showInformationMessage('No questions asked yet!');
      return;
    }

    const questionItems = questionsData.map((q, index) => ({
      label: `Q${index + 1}: ${q.text}`,
      detail: q.highlightedCode || 'No highlighted code',
      index,
    }));

    const selectedQuestion = await vscode.window.showQuickPick(questionItems, {
      placeHolder: 'Select a question to answer',
    });

    if (!selectedQuestion) {
      return;
    }

    const question = questionsData[selectedQuestion.index];
    const filePath = question.filePath;
    const baseDir = getBaseWorkspaceDirectory();
    const studentDir = getStudentDirectory(filePath);

    // Create a Webview Panel for answering a question
    const panel = vscode.window.createWebviewPanel(
      'answerQuestion',
      'Answer Question',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
              <!DOCTYPE html>
              <html lang="en">
              <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Answer Question</title>
              <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  textarea { width: 100%; height: 80px; font-size: 14px; margin-bottom: 10px; }
                  button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
                  button:hover { background: #005a9e; }
              </style>
              </head>
              <body>
              <h1>Answer a Question</h1>
              <p><strong>Question:</strong> ${question.text}</p>
              <p><strong>Highlighted Code:</strong></p>
              <pre>${question.highlightedCode || 'No highlighted code'}</pre>
              <textarea id="answer" placeholder="Type your answer here..."></textarea>
              <button onclick="submitAnswer()">Submit Answer</button>
              <script>
                  const vscode = acquireVsCodeApi();
                  function submitAnswer() {
                  const answer = document.getElementById('answer').value;
                  if (answer.trim() === '') {
                      alert('Answer cannot be empty!');
                      return;
                  }
                  vscode.postMessage({ answer });
                  }
              </script>
              </body>
              </html>
              `;

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.answer) {
        question.answer = message.answer;

        try {
          // Update global questions file
          const globalQuestionsPath = path.join(baseDir, 'questionsData.json');
          const globalQuestions = loadQuestionData(globalQuestionsPath);
          const globalIndex = globalQuestions.findIndex(q =>
            q.filePath === question.filePath &&
            q.range.start.line === question.range.start.line &&
            q.timestamp === question.timestamp
          );
          if (globalIndex !== -1) {
            globalQuestions[globalIndex].answer = message.answer;
            saveQuestionData(globalQuestions, globalQuestionsPath);
          }

          // Update student-specific questions file if exists
          if (studentDir) {
            const studentQuestionsPath = path.join(studentDir, 'questionsData.json');
            if (fs.existsSync(studentQuestionsPath)) {
              const studentQuestions = loadQuestionData(studentQuestionsPath);
              const studentIndex = studentQuestions.findIndex(q =>
                q.filePath === question.filePath &&
                q.range.start.line === question.range.start.line &&
                q.timestamp === question.timestamp
              );
              if (studentIndex !== -1) {
                studentQuestions[studentIndex].answer = message.answer;
                saveQuestionData(studentQuestions, studentQuestionsPath);
              }
            }
          }

          vscode.window.showInformationMessage('Answer added successfully!');
          panel.dispose();
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to save answer: ${error.message}`);
        }
      }
    });
  });

  // Command: View questions and answers
  let viewQuestionsAndAnswersCommand = vscode.commands.registerCommand('extension.viewQuestionsAndAnswers', async () => {
    // This can remain largely the same, but we should load from both locations
    const baseDir = getBaseWorkspaceDirectory();
    const globalQuestionsPath = path.join(baseDir, 'questionsData.json');

    let allQuestions = [];

    // Load global questions
    if (fs.existsSync(globalQuestionsPath)) {
      allQuestions.push(...loadQuestionData(globalQuestionsPath));
    }

    // Load student-specific questions
    const studentDirs = fs.readdirSync(baseDir)
      .filter(name => !name.includes('.') && name !== 'node_modules'); // Simple filter for student directories

    for (const studentDir of studentDirs) {
      const studentQuestionsPath = path.join(baseDir, studentDir, 'questionsData.json');
      if (fs.existsSync(studentQuestionsPath)) {
        allQuestions.push(...loadQuestionData(studentQuestionsPath));
      }
    }

    // Remove duplicates (same question in both files)
    const uniqueQuestions = allQuestions.filter((question, index, self) =>
      index === self.findIndex(q =>
        q.filePath === question.filePath &&
        q.range.start.line === question.range.start.line &&
        q.timestamp === question.timestamp
      )
    );

    if (uniqueQuestions.length === 0) {
      vscode.window.showInformationMessage('No questions or answers available yet!');
      return;
    }

    // Update in-memory data
    questionsData.length = 0;
    questionsData.push(...uniqueQuestions);

    // Rest of your existing viewQuestionsAndAnswersCommand implementation...
    // (the Webview panel creation and HTML generation)

    // Create a Webview Panel for viewing questions and answers
    const panel = vscode.window.createWebviewPanel(
      'viewQuestionsAndAnswers', // Panel ID
      'View Questions and Answers', // Panel title
      vscode.ViewColumn.One, // Show in the active column
      { enableScripts: true } // Allow JavaScript in the Webview
    );

    // Build a table with all the questions and answers
    const questionsTable = questionsData.map((qa, index) => {
      const range = `${qa.range.start.line}:${qa.range.start.character} - ${qa.range.end.line}:${qa.range.end.character}`;

      // Extract only the last two parts of the file path for display
      const filePathParts = qa.filePath.split('/');

      const truncateCharacters = (text, charLimit) => {
        return text.length > charLimit ? text.slice(0, charLimit) + '...' : text;
      };
      let shortenedFilePath = filePathParts.length > 2
        ? `.../${filePathParts.slice(-3).join('/')}`
        : qa.filePath;
      shortenedFilePath = truncateCharacters(shortenedFilePath, 30);

      return `
          <tr>
              <td>${index + 1}</td>
              <td title="${qa.filePath}">${shortenedFilePath}</td>
              <td><pre>${qa.highlightedCode || 'No highlighted code'}</pre></td>
              <td>${qa.text || 'No question'}</td>
              <td>${qa.answer || 'No answer'}</td>
          </tr>
          `;
    }).join('');

    // HTML content for the Webview
    panel.webview.html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>View Questions and Answers</title>
              <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                  th { background-color: #007acc; color: white; }
                  pre { background-color: rgb(0, 0, 0); padding: 5px; border-radius: 5px; color: white; }
                  button { margin-top: 20px; padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
                  button:hover { background: #005a9e; }
              </style>
          </head>
          <body>
              <h1>All Questions and Answers</h1>
              <table>
                  <thead>
                      <tr>
                          <th>#</th>
                          <th>File</th>
                          <th>Highlighted Code</th>
                          <th>Question</th>
                          <th>Answer</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${questionsTable}
                  </tbody>
              </table>
              <button id="export">Export to CSV</button>
              <script>
                  document.getElementById('export').addEventListener('click', () => {
                      const rows = [
                          ['#', 'File', 'Range', 'Highlighted Code', 'Question', 'Answer'],
                          ...${JSON.stringify(questionsData.map((qa, index) => [
      index + 1,
      qa.filePath,
      `${qa.range.start.line}:${qa.range.start.character} - ${qa.range.end.line}:${qa.range.end.character}`,
      qa.highlightedCode || 'No highlighted code',
      qa.text || 'No question',
      qa.answer || 'No answer'
    ]))}
                      ];

                      const csvContent = rows.map(e => e.join(",")).join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.setAttribute('href', url);
                      link.setAttribute('download', 'questions_and_answers.csv');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                  });
              </script>
          </body>
          </html>
      `;
  });

  let addPersonalizedQuestionCommand = vscode.commands.registerCommand('extension.addPersonalizedQuestion', async () => {
    console.log('Command executed!');
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

    // Get existing questions for suggestions
    let existingQuestions = [];
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders) {
        const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/personalizedQuestions.json`);
        const fileContent = await vscode.workspace.fs.readFile(uri);
        const data = JSON.parse(fileContent.toString());
        existingQuestions = data.map(item => item.text).filter(Boolean);
      }
    } catch (error) {
      console.log('Could not load existing questions:', error);
    }

    // Function to load existing answers
    const loadExistingAnswers = async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/quiz_questions_answers.json`);
          const fileContent = await vscode.workspace.fs.readFile(uri);
          return JSON.parse(fileContent.toString());
        }
      } catch (error) {
        // File doesn't exist yet, return empty array
        return [];
      }
      return [];
    };

    // Create a Webview Panel for adding a personalized question
    const panel = vscode.window.createWebviewPanel(
      'addPersonalizedQuestion',
      'Add Personalized Question',
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
            <title>Add Personalized Question</title>
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
            <h1>Add a Personalized Question</h1>

            <p><strong>Edit Highlighted Code:</strong></p>
            <textarea id="codeBlock" class="code-area">${selectedText}</textarea>
            <button onclick="copyAndPasteCode()">Copy & Paste Code</button>
            <button onclick="saveCode()">Save Code</button>
            
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

                function saveCode() {
                    const updatedCode = document.getElementById('codeBlock').value;
                    vscode.postMessage({ type: 'updateCode', updatedCode });
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
      if (message.type === 'updateCode') {
        vscode.window.showInformationMessage('Code updated successfully!');
        selectedText = message.updatedCode;
      }

      if (message.type === 'submitQuestion') {
        const studentName = extractStudentName(editor.document.uri.fsPath);
        const questionData = {
          filePath: editor.document.uri.fsPath,
          range: {
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character },
          },
          text: message.question,
          highlightedCode: message.editedCode,
          excludeFromQuiz: false
        };

        // Save to personalizedQuestions.json
        personalizedQuestionsData.push(questionData);
        await saveDataToFile('personalizedQuestions.json', personalizedQuestionsData);

        // Save answer to quiz_questions_answers.json if provided
        if (message.answer && message.answer.trim() !== '') {
          try {
            // Load existing answers
            let answersData = await loadExistingAnswers();

            // Add new answer
            answersData.push({
              questionId: personalizedQuestionsData.length - 1,
              questionText: message.question,
              answer: message.answer.trim(),
              studentName: studentName,
              filePath: editor.document.uri.fsPath,
              timestamp: new Date().toISOString(),
              highlightedCode: message.editedCode
            });

            // Save back to file
            await saveDataToFile('quiz_questions_answers.json', answersData);
            vscode.window.showInformationMessage('Answer saved successfully!');
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to save answer: ${error.message}`);
          }
        }


        vscode.window.showInformationMessage('Personalized question added successfully!');
        panel.dispose();
      }
    });
  });





  //Helper function to save data to a file

  async function saveDataToFile(filename, data) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }

    const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${filename}`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(data, null, 2)));
  }




  function openEditQuestionPanel(index) {
    const question = personalizedQuestionsData[index];

    // Create a Webview Panel for editing the question
    const panel = vscode.window.createWebviewPanel(
      'editQuestion',
      'Edit Question',
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
      <title>Edit Question</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        textarea { width: 100%; height: 200px; font-size: 14px; margin-bottom: 10px; }
        button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
        button:hover { background: #005a9e; }
      </style>
    </head>
    <body>
      <h1>Edit Question</h1>
      <p><strong>Question:</strong></p>
      <textarea id="question">${question.text || 'No question'}</textarea>
      <p><strong>Highlighted Code:</strong></p>
      <textarea id="code">${question.highlightedCode || 'No highlighted code'}</textarea>
      <button onclick="saveChanges()">Save</button>
      <script>
        const vscode = acquireVsCodeApi();

        function saveChanges() {
          const updatedQuestion = document.getElementById('question').value;
          const updatedCode = document.getElementById('code').value;
          vscode.postMessage({ type: 'saveChanges', index: ${index}, updatedQuestion, updatedCode });
        }
      </script>
    </body>
    </html>
  `;

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage((message) => {
      if (message.type === 'saveChanges') {
        // Update the data in memory
        personalizedQuestionsData[message.index].text = message.updatedQuestion;
        personalizedQuestionsData[message.index].highlightedCode = message.updatedCode;

        saveDataToFile('personalizedQuestions.json', personalizedQuestionsData);
        vscode.window.showInformationMessage('Changes saved successfully!');
        panel.dispose(); // Close the edit panel
      }
    });
  }


  const studentNumbers = new Map();
  let studentCount = 0;
  const questionLabels = {};


  let viewPersonalizedQuestionsCommand = vscode.commands.registerCommand('extension.viewPersonalizedQuestions', async () => {
    if (personalizedQuestionsData.length === 0) {
      vscode.window.showInformationMessage('No personalized questions added yet!');
      return;
    }

    // Create a Webview Panel for viewing personalized questions
    const panel = vscode.window.createWebviewPanel(
      'viewPersonalizedQuestions',
      'View Personalized Questions',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // Function to get all CIS students from the workspace
    const getAllCISStudents = async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return [];

        const cisStudents = new Set();
        for (const folder of workspaceFolders) {
          const folderUri = folder.uri;
          if (folderUri.fsPath.includes("CIS")) {
            const files = await vscode.workspace.fs.readDirectory(folderUri);
            for (const [name, type] of files) {
              if (type === vscode.FileType.Directory) {
                cisStudents.add(name);
              }
            }
          }
        }
        return Array.from(cisStudents);
      } catch (error) {
        console.error("Error fetching CIS students:", error);
        return [];
      }
    };

    // Get all CIS students
    const allCISStudents = await getAllCISStudents();

    // Calculate question counts per student
    const studentQuestionCounts = new Map();
    let maxQuestions = 0;

    // Rebuild the questionLabels since we need it for the webview
    const studentNumbers = new Map();
    let studentCount = 0;
    const questionLabels = {};

    personalizedQuestionsData.forEach((question, index) => {
      const studentName = extractStudentName(question.filePath);

      if (!studentNumbers.has(studentName)) {
        studentCount++;
        studentNumbers.set(studentName, { count: 0, label: studentCount });
      }

      const studentInfo = studentNumbers.get(studentName);
      studentInfo.count++;
      const questionLabel = String.fromCharCode(96 + studentInfo.count); // Convert 1 -> 'a', 2 -> 'b', etc.
      questionLabels[index] = `${studentInfo.label}${questionLabel}`;

      // Count questions per student for coloring
      const count = studentQuestionCounts.get(studentName) || 0;
      studentQuestionCounts.set(studentName, count + 1);
      if (count + 1 > maxQuestions) {
        maxQuestions = count + 1;
      }
    });

    // Build the summary table HTML
    const buildSummaryTable = () => {
      const summaryRows = allCISStudents.map(student => {
        const count = studentQuestionCounts.get(student) || 0;
        let color = 'red'; // default for zero questions

        if (count === maxQuestions && maxQuestions > 0) {
          color = 'green';
        } else if (count > 0 && count < maxQuestions) {
          color = 'yellow';
        }

        return `
                <tr style="background-color: ${color}">
                    <td>${student}</td>
                    <td>${count}</td>
                </tr>
            `;
      }).join('');

      return `
            <div id="summaryTableContainer" style="display: none; max-height: 300px; overflow-y: auto; margin-top: 20px;">
                <h2>Student Question Summary</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Question Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryRows}
                    </tbody>
                </table>
            </div>
        `;
    };

    // Determine color for question labels
    const getLabelColor = (studentName) => {
      const count = studentQuestionCounts.get(studentName) || 0;
      if (count === maxQuestions && maxQuestions > 0) return 'green';
      if (count > 0 && count < maxQuestions) return 'yellow';
      return 'red';
    };

    const truncateCharacters = (text, charLimit) => {
      return text.length > charLimit ? text.slice(0, charLimit) + '...' : text;
    };

    // Build a table with editable fields, revert button, and a checkbox inside the Actions column
    const questionsTable = personalizedQuestionsData.map((question, index) => {
      const studentName = extractStudentName(question.filePath);
      const labelColor = getLabelColor(studentName);

      const filePathParts = question.filePath.split('/');
      let shortenedFilePath = filePathParts.length > 2
        ? `.../${filePathParts.slice(-3).join('/')}`
        : question.filePath;

      shortenedFilePath = truncateCharacters(shortenedFilePath, 30);

      return `
        <tr id="row-${index}" data-index="${index}" data-label="${questionLabels[index]}" data-file="${shortenedFilePath}" data-code="${question.highlightedCode || 'No highlighted code'}" data-question="${question.text || 'No question'}">
            <td style="background-color: ${labelColor}">${questionLabels[index]}</td>
            <td title="${question.filePath}">${shortenedFilePath}</td>
            <td>
                <textarea class="code-area" id="code-${index}">${question.highlightedCode || 'No highlighted code'}</textarea>
            </td>
            <td>
                <textarea class="question-area" id="question-${index}">${question.text || 'No question'}</textarea>
            </td>
            <td>
                <button onclick="saveChanges(${index})">Save</button>
                <button onclick="revertChanges(${index})" style="background-color: orange; color: white;">Revert</button>
                <button onclick="editQuestion(${index})" style="background-color: green; color: white;">Edit</button>
                <button onclick="copyQuestionText(${index})" style="background-color: #2196F3; color: white;">Copy</button>
                <br>
                <input type="checkbox" id="exclude-${index}" ${question.excludeFromQuiz ? 'checked' : ''} onchange="toggleExclude(${index})">
                <label for="exclude-${index}">Exclude from Quiz</label>
            </td>
        </tr>
        `;
    }).join('');

    // HTML content for the Webview
    panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Personalized Questions</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color:rgb(255, 255, 255);
            color: black;
        }
        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .controls-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            align-items: center;
            flex-wrap: wrap;
        }
        .search-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }
        th { 
            background-color: #007acc; 
            color: white; 
            position: sticky;
            top: 0;
        }
        textarea { 
            width: 100%; 
            height: 100px; 
            font-size: 14px; 
            border: 1px solid #ccc; 
            padding: 8px; 
            resize: vertical;
        }
        .code-area { 
            background-color: #1e1e1e; 
            color: #d4d4d4; 
            font-family: monospace; 
        }
        .question-area { 
            background-color: #f9f9f9; 
            color: #333; 
            font-family: sans-serif; 
        }
        button { 
            padding: 8px 12px; 
            margin: 2px; 
            cursor: pointer; 
            border: none;
            border-radius: 4px;
            font-weight: bold;
        }
        button:hover {
            opacity: 0.9;
        }
        #refreshBtn {
            background-color: #4CAF50; 
            color: white;
        }
        #toggleSummaryBtn {
            background-color: #673AB7;
            color: white;
        }
        input[type="text"] {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 250px;
        }
        input[type="checkbox"] { 
            transform: scale(1.2); 
            margin-top: 5px; 
        }
        #summaryTableContainer table th { 
            background-color: #007acc; 
            color: white; 
        }
        #summaryTableContainer table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
        }
        .total-count {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 20px;
            gap: 10px;
            flex-wrap: wrap;
        }
        .pagination-controls {
            display: flex;
            gap: 5px;
            align-items: center;
        }
        .page-btn {
            padding: 5px 10px;
            border: 1px solid #ddd;
            background-color: white;
            cursor: pointer;
            border-radius: 4px;
            min-width: 30px;
            text-align: center;
        }
        .page-btn:hover:not(.active):not(:disabled) {
            background-color: #f1f1f1;
        }
        .page-btn.active {
            background-color: #007acc;
            color: white;
            border-color: #007acc;
        }
        .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .page-jump {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .page-jump input {
            width: 50px;
            padding: 5px;
            text-align: center;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .rows-per-page {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .rows-per-page select {
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="header-container">
        <h1>All Personalized Questions</h1>
        <div class="total-count">Total Questions: ${personalizedQuestionsData.length}</div>
    </div>

    <div class="controls-container">
        <button id="refreshBtn" onclick="refreshView()">Refresh View</button>
        <button id="toggleSummaryBtn" onclick="toggleSummaryTable()">Toggle Student Summary</button>
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search questions..." oninput="filterQuestions()">
            <span id="filterCount"></span>
        </div>
    </div>

    ${buildSummaryTable()}
    
    <table id="questionsTable">
        <thead>
            <tr>
                <th>#</th>
                <th>File</th>
                <th>Highlighted Code</th>
                <th>Question</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="questionsTableBody">
            ${questionsTable}
        </tbody>
    </table>

    <div class="pagination-container">
        <div class="pagination-controls">
            <button class="page-btn" onclick="goToFirstPage()" title="First Page" id="firstPageBtn">&laquo;</button>
            <button class="page-btn" onclick="goToPreviousPage()" title="Previous Page" id="prevPageBtn">&lt;</button>
            
            <div id="pageNumbers" style="display: flex; gap: 5px;"></div>
            
            <button class="page-btn" onclick="goToNextPage()" title="Next Page" id="nextPageBtn">&gt;</button>
            <button class="page-btn" onclick="goToLastPage()" title="Last Page" id="lastPageBtn">&raquo;</button>
        </div>
        
        <div class="page-jump">
            <span>Go to:</span>
            <input type="number" id="pageJumpInput" min="1" value="1">
            <button onclick="jumpToPage()">Go</button>
            <span>of <span id="totalPagesDisplay">1</span></span>
        </div>
        
        <div class="rows-per-page">
            <label for="rowsPerPage">Rows per page:</label>
            <select id="rowsPerPage" onchange="changeRowsPerPage()">
                <option value="10">10</option>
                <option value="15" selected>15</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const originalData = JSON.parse(JSON.stringify(${JSON.stringify(personalizedQuestionsData)}));
        const questionLabels = JSON.parse('${JSON.stringify(questionLabels)}');
        
        // Pagination variables
        let currentPage = 1;
        let rowsPerPage = 15;
        let totalPages = Math.ceil(${personalizedQuestionsData.length} / rowsPerPage);
        let filteredRows = [];
        let isFiltered = false;

        // Initialize the table
        function initializeTable() {
            updatePaginationControls();
            renderPageNumbers();
            updateVisibleRows();
        }

        // Update which rows are visible based on current page
        function updateVisibleRows() {
            const rows = document.querySelectorAll('#questionsTableBody tr');
            const startIdx = (currentPage - 1) * rowsPerPage;
            const endIdx = startIdx + rowsPerPage;
            
            rows.forEach((row, index) => {
                if (isFiltered && !filteredRows.includes(index)) {
                    row.style.display = 'none';
                    return;
                }
                
                if (index >= startIdx && index < endIdx) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        // Update pagination controls state
        function updatePaginationControls() {
            document.getElementById('firstPageBtn').disabled = currentPage === 1;
            document.getElementById('prevPageBtn').disabled = currentPage === 1;
            document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
            document.getElementById('lastPageBtn').disabled = currentPage === totalPages;
            document.getElementById('pageJumpInput').value = currentPage;
            document.getElementById('totalPagesDisplay').textContent = totalPages;
        }

        // Render page number buttons
        function renderPageNumbers() {
            const container = document.getElementById('pageNumbers');
            container.innerHTML = '';
            
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            if (startPage > 1) {
                const btn = document.createElement('button');
                btn.className = 'page-btn';
                btn.textContent = '1';
                btn.onclick = () => goToPage(1);
                container.appendChild(btn);
                
                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    container.appendChild(ellipsis);
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('button');
                btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
                btn.textContent = i;
                btn.onclick = () => goToPage(i);
                container.appendChild(btn);
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    container.appendChild(ellipsis);
                }
                
                const btn = document.createElement('button');
                btn.className = 'page-btn';
                btn.textContent = totalPages;
                btn.onclick = () => goToPage(totalPages);
                container.appendChild(btn);
            }
        }

        // Navigation functions
        function goToPage(page) {
            if (page < 1 || page > totalPages) return;
            currentPage = page;
            updateVisibleRows();
            updatePaginationControls();
            renderPageNumbers();
        }

        function goToFirstPage() {
            goToPage(1);
        }

        function goToPreviousPage() {
            goToPage(currentPage - 1);
        }

        function goToNextPage() {
            goToPage(currentPage + 1);
        }

        function goToLastPage() {
            goToPage(totalPages);
        }

        function jumpToPage() {
            const input = document.getElementById('pageJumpInput');
            const page = parseInt(input.value);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
                goToPage(page);
            }
        }

        // Change rows per page
        function changeRowsPerPage() {
            rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
            totalPages = Math.ceil(isFiltered ? filteredRows.length : ${personalizedQuestionsData.length} / rowsPerPage);
            if (currentPage > totalPages) {
                currentPage = totalPages;
            }
            initializeTable();
        }

        // Filter questions based on search term
        function filterQuestions() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#questionsTableBody tr');
            filteredRows = [];
            
            if (searchTerm === '') {
                isFiltered = false;
                document.getElementById('filterCount').textContent = '';
            } else {
                isFiltered = true;
                rows.forEach((row, index) => {
                    const label = row.dataset.label.toLowerCase();
                    const file = row.dataset.file.toLowerCase();
                    const code = row.dataset.code.toLowerCase();
                    const question = row.dataset.question.toLowerCase();
                    
                    if (label.includes(searchTerm) || file.includes(searchTerm) || 
                        code.includes(searchTerm) || question.includes(searchTerm)) {
                        filteredRows.push(index);
                    }
                });
                
                document.getElementById('filterCount').textContent = filteredRows.length > 0 
                    ? \`\${filteredRows.length} matches\` 
                    : 'No matches';
            }
            
            totalPages = Math.ceil(isFiltered ? filteredRows.length : ${personalizedQuestionsData.length} / rowsPerPage);
            currentPage = 1;
            initializeTable();
        }

        // [Rest of your existing functions remain unchanged]
        function copyQuestionText(index) {
            const questionTextArea = document.getElementById('question-' + index);
            const selectedText = questionTextArea.value.substring(
                questionTextArea.selectionStart,
                questionTextArea.selectionEnd
            );
            const textToCopy = selectedText.length > 0 ? selectedText : questionTextArea.value;

            navigator.clipboard.writeText(textToCopy).then(() => {
                vscode.postMessage({ 
                    type: 'showInformationMessage', 
                    message: 'Copied to clipboard: ' + 
                        (selectedText.length > 0 ? 'Selected text' : 'Full question')
                });
            }).catch(err => {
                vscode.postMessage({ 
                    type: 'showErrorMessage', 
                    message: 'Failed to copy text: ' + err 
                });
            });
        }

        function toggleSummaryTable() {
            const container = document.getElementById('summaryTableContainer');
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }

        function refreshView() {
            vscode.postMessage({ type: 'refreshView' });
        }

        function saveChanges(index) {
            const updatedCode = document.getElementById('code-' + index).value;
            const updatedQuestion = document.getElementById('question-' + index).value;
            vscode.postMessage({ type: 'saveChanges', index, updatedCode, updatedQuestion });
        }

        function revertChanges(index) {
            document.getElementById('code-' + index).value = originalData[index].highlightedCode;
            document.getElementById('question-' + index).value = originalData[index].text;
            document.getElementById('exclude-' + index).checked = originalData[index].excludeFromQuiz;
        }

        function toggleExclude(index) {
            const excludeStatus = document.getElementById('exclude-' + index).checked;
            vscode.postMessage({ type: 'toggleExclude', index, excludeStatus });
        }

        function editQuestion(index) {
            vscode.postMessage({ type: 'editQuestion', index });
        }
        
        // Initialize the table when the page loads
        window.addEventListener('load', initializeTable);
    </script>
</body>
</html>
    `;

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage((message) => {
      if (message.type === 'saveChanges') {
        // Update the data in memory
        personalizedQuestionsData[message.index].highlightedCode = message.updatedCode;
        personalizedQuestionsData[message.index].text = message.updatedQuestion;

        saveDataToFile('personalizedQuestions.json', personalizedQuestionsData);
        vscode.window.showInformationMessage('Changes saved successfully!');
      }

      if (message.type === 'toggleExclude') {
        // Save exclude checkbox status automatically
        personalizedQuestionsData[message.index].excludeFromQuiz = message.excludeStatus;
        saveDataToFile('personalizedQuestions.json', personalizedQuestionsData);
      }

      if (message.type === 'editQuestion') {
        // Open a new webview panel for editing the question
        openEditQuestionPanel(message.index);
      }

      if (message.type === 'refreshView') {
        // Close and reopen the panel to refresh the view
        panel.dispose(); // Close the current panel
        vscode.commands.executeCommand('extension.viewPersonalizedQuestions'); // Reopen it
      }

      if (message.type === 'showInformationMessage') {
        vscode.window.showInformationMessage(message.message);
      }

      if (message.type === 'showErrorMessage') {
        vscode.window.showErrorMessage(message.message);
      }
    });
  });


  let generatePersonalizedQuizCommand = vscode.commands.registerCommand(
    'extension.generatePersonalizedQuiz',
    async () => {
      if (personalizedQuestionsData.length === 0) {
        vscode.window.showErrorMessage('No personalized questions available to generate the quiz!');
        return;
      }

      // Prompt user to select the config file
      const configFileUri = await vscode.window.showOpenDialog({
        canSelectFolders: false,
        canSelectFiles: true,
        canSelectMany: false,
        openLabel: 'Select Config File',
        filters: { 'JSON Files': ['json'] },
        defaultUri: vscode.Uri.file(path.join(vscode.workspace.rootPath, 'cqlc.config.json'))
      });

      if (!configFileUri || configFileUri.length === 0) {
        vscode.window.showErrorMessage('No config file selected.');
        return;
      }

      const configFilePath = configFileUri[0].fsPath;

      // Load config file
      let config;
      try {
        const configFileContent = fs.readFileSync(configFilePath, 'utf8');
        config = JSON.parse(configFileContent);
      } catch (error) {
        vscode.window.showErrorMessage(`Error reading config file: ${error.message}`);
        return;
      }

      // Validate required fields in config
      const requiredFields = [
        'title', 'topic', 'folder', 'pl_root', 'pl_question_root', 'pl_assessment_root',
        'set', 'number', 'points_per_question', 'startDate', 'endDate', 'timeLimitMin',
        'daysForGrading', 'reviewEndDate', 'language'
      ];
      for (const field of requiredFields) {
        if (!config[field]) {
          vscode.window.showErrorMessage(`Missing required field in config: ${field}`);
          return;
        }
      }

      // Construct paths
      const questionsFolderPath = path.join(config.pl_root, 'questions', config.pl_question_root, config.folder);
      const assessmentFolderPath = path.join(config.pl_root, config.pl_assessment_root, config.folder);
      const instructorFolderPath = path.join(questionsFolderPath, 'instructor');
      const instructorAssessmentPath = path.join(assessmentFolderPath, 'instructor');

      // Ensure directories exist
      [questionsFolderPath, assessmentFolderPath, instructorFolderPath, instructorAssessmentPath].forEach(folder => {
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }
      });

      // Group questions by student
      const questionsByStudent = {};
      for (const question of personalizedQuestionsData) {
        const studentName = extractStudentName(question.filePath, config);
        if (!questionsByStudent[studentName]) {
          questionsByStudent[studentName] = [];
        }
        questionsByStudent[studentName].push(question);
      }

      // Generate questions and info.json files for each student
      for (const [studentName, questions] of Object.entries(questionsByStudent)) {
        // Create the student's question folder
        const studentQuestionFolderPath = path.join(questionsFolderPath, studentName);
        if (!fs.existsSync(studentQuestionFolderPath)) {
          fs.mkdirSync(studentQuestionFolderPath, { recursive: true });
        }

        // Generate question.html and info.json for each question
        for (const [index, question] of questions.entries()) {
          const questionFolderPath = path.join(studentQuestionFolderPath, `question${index + 1}`);
          if (!fs.existsSync(questionFolderPath)) {
            fs.mkdirSync(questionFolderPath, { recursive: true });
          }

          // Create question.html with proper PL structure
          const questionHTMLContent = `
<pl-question-panel>
<markdown>
${question.text || 'No question text provided'}
</markdown>
    ${question.highlightedCode ? `<pl-code language="${config.language}">\n${question.highlightedCode}\n</pl-code>` : ''}
</pl-question-panel>`;

          fs.writeFileSync(path.join(questionFolderPath, 'question.html'), questionHTMLContent);

          // Create info.json
          fs.writeFileSync(path.join(questionFolderPath, 'info.json'), JSON.stringify({
            uuid: uuidv4(),
            type: "v3",
            gradingMethod: "Manual",
            title: `${config.title} Q${index + 1}`,
            topic: config.topic
          }, null, 2));
        }

        // Create the student's assessment folder
        const studentAssessmentFolderPath = path.join(assessmentFolderPath, studentName);
        if (!fs.existsSync(studentAssessmentFolderPath)) {
          fs.mkdirSync(studentAssessmentFolderPath, { recursive: true });
        }

        // Generate infoAssessment.json for student
        const infoAssessmentContent = {
          uuid: uuidv4(),
          type: "Exam",
          title: config.title,
          set: config.set,
          number: config.number,
          allowAccess: [
            {
              mode: "Public",
              uids: [studentName],
              credit: 100,
              timeLimitMin: config.timeLimitMin,
              startDate: config.startDate,
              endDate: config.endDate,
              ...(config.password && { password: config.password })
            },
            {
              mode: "Public",
              credit: 0,
              startDate: new Date(new Date(config.startDate).getTime() + config.daysForGrading * 86400000).toISOString(),
              endDate: config.reviewEndDate,
              active: false
            }
          ],
          zones: [
            {
              questions: questions.map((q, index) => ({
                id: `${config.pl_question_root}/${config.folder}/${studentName}/question${index + 1}`,
                points: config.points_per_question
              }))
            }
          ]
        };

        fs.writeFileSync(path.join(studentAssessmentFolderPath, 'infoAssessment.json'), JSON.stringify(infoAssessmentContent, null, 2));
      }

      // Generate combined question file for instructor
      const instructorQuestionFolderPath = path.join(instructorFolderPath, 'combined_questions');
      if (!fs.existsSync(instructorQuestionFolderPath)) {
        fs.mkdirSync(instructorQuestionFolderPath, { recursive: true });
      }

      // Create combined question.html with proper PL structure
      let combinedHTMLContent = `<pl-question-panel>
<markdown>
# ${config.title} - All Student Questions
<hr><br>
</markdown>
</pl-question-panel>`;

      // Add each student's questions
      for (const [studentName, questions] of Object.entries(questionsByStudent)) {
        combinedHTMLContent += `
<pl-question-panel>
<markdown>
## Student: ${studentName}
</markdown>
</pl-question-panel>`;

        questions.forEach((question, index) => {
          // Extract the code blocks and question text
          const questionText = question.text || 'No question text provided';
          const codeBlock = question.highlightedCode ?
            `<pl-code language="${config.language}">\n${question.highlightedCode}\n</pl-code>` : '';

          combinedHTMLContent += `
<pl-question-panel>
<markdown>
### Question ${index + 1}
${questionText}
</markdown>
    ${codeBlock}
</pl-question-panel>
<br><hr><br>
`;
        });
      }

      // Write the combined question file
      fs.writeFileSync(
        path.join(instructorQuestionFolderPath, 'question.html'),
        combinedHTMLContent
      );

      // Write instructor info.json
      fs.writeFileSync(
        path.join(instructorQuestionFolderPath, 'info.json'),
        JSON.stringify({
          uuid: uuidv4(),
          gradingMethod: "Manual",
          type: "v3",
          title: `${config.title} - All Questions`,
          topic: config.topic
        }, null, 2)
      );

      // Generate instructor assessment file
      const instructorInfoAssessmentContent = {
        uuid: uuidv4(),
        type: "Exam",
        title: `${config.title} (Instructor View)`,
        set: config.set,
        number: config.number,
        allowAccess: [
          {
            mode: "Public",
            uids: ["instructor"],
            credit: 100,
            timeLimitMin: config.timeLimitMin * 3,
            startDate: new Date(Date.now() - 86400000).toISOString(),
            endDate: new Date(new Date(config.reviewEndDate).getTime() + (86400000 * 30)).toISOString(),
            active: true
          }
        ],
        zones: [
          {
            title: "Combined Questions",
            questions: [{
              id: `${config.pl_question_root}/${config.folder}/instructor/combined_questions`,
              points: 0,
              description: "All student questions combined"
            }]
          }
        ]
      };

      fs.writeFileSync(
        path.join(instructorAssessmentPath, 'infoAssessment.json'),
        JSON.stringify(instructorInfoAssessmentContent, null, 2)
      );

      vscode.window.showInformationMessage(
        `Successfully generated personalized quiz!\n\n` +
        `Student questions: ${questionsFolderPath}\n` +
        `Student assessments: ${assessmentFolderPath}\n` +
        `Instructor combined view: ${instructorQuestionFolderPath}\n` +
        `Instructor assessment: ${instructorAssessmentPath}`,
        { modal: true }
      );
    }
  );

  // Register all commands
  context.subscriptions.push(
    highlightAndCommentCommand,
    viewCommentsCommand,
    askQuestionCommand,
    answerQuestionCommand,
    viewQuestionsAndAnswersCommand,
    addPersonalizedQuestionCommand,
    viewPersonalizedQuestionsCommand,
    generatePersonalizedQuizCommand
  );
}

/**
 * Deactivate the extension
 */
function deactivate() { }

module.exports = {
  activate,
  deactivate,
};