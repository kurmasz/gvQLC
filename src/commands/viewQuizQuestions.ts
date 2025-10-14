/************************************************************************************
 * 
 * viewQuizQuestions.ts
 * 
 * The viewQuizQuestions command.
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';

import * as gvQLC from '../gvQLC';
const state = gvQLC.state;

import { extractStudentName } from '../utilities';
import * as Util from '../utilities';
import { PersonalizedQuestionsData } from '../types';
import { logToFile } from '../fileLogger';


export const viewQuizQuestionsCommand = vscode.commands.registerCommand('gvqlc.viewQuizQuestions', async () => {

    // Also displays error if persisted data cannot be loaded.
    if (!Util.loadPersistedData()) {
        console.log('Could not load data');
        return false;
    }

    if (state.personalizedQuestionsData.length === 0) {
        vscode.window.showInformationMessage('No personalized questions added yet!');
        return;
    }

    const mapStudentName = (name: string) => {
        return state.studentNameMapping[name] || name;
    };

    // config is lazy-loaded (so that the modal dialog asking the user to 
    // crate a config file is only shown if the user actually invokes a 
    // command that needs a config file).
    // Because the function is async, it is cleaner and more efficient to hold
    // onto the config and pass it around once we obtain it.
    const config = await gvQLC.config();
    const allStudentsPromise = Util.getAllStudentNames(config);

    // Separate out questions with student name as key for array of question data
    const questionsByStudent: Record<string, PersonalizedQuestionsData[]> = {};
    const submissionRoot = config.submissionRoot;
    for (const question of state.personalizedQuestionsData) {
        const studentName = extractStudentName(question.filePath, submissionRoot);
        if (!questionsByStudent[studentName]) {
            questionsByStudent[studentName] = [];
        }
        questionsByStudent[studentName].push(question);
    }

    // Record the amount of questions assigned to each student
    // and how many students have x number of questions.
    const frequencyMap = new Map<number, number>();

    const studentQuestionCounts = new Map<string, number>();
    let maxQuestions = 0;
    for (const studentName in questionsByStudent) {
        const count = questionsByStudent[studentName].length;
        studentQuestionCounts.set(studentName, count);
        if (count > maxQuestions) {
            maxQuestions = count;
        }
        frequencyMap.set(count, (frequencyMap.get(count) ?? 0) + 1);
    }

    // Compute the mode (most common question count)
    let modeQuestions = -1;
    let highestFrequency = 0;

    for (const [count, freq] of frequencyMap.entries()) {
        if (freq > highestFrequency || (freq === highestFrequency && count > modeQuestions)) {
            highestFrequency = freq;
            modeQuestions = count;
        }
    }

    console.log(`Max questions assigned to any student: ${maxQuestions}`);
    console.log(`Most common number of questions (mode): ${modeQuestions}`);

    // Create labels for each student's questions (e.g., 1a, 1b, 2a, etc.)
    const questionLabels: Record<string, string> = {};
    const studentNumbers: Record<string, number> = {};

    let studentCounter = 1;
    let questionIndex = 0;
    const sortedStudentNames = Object.keys(questionsByStudent).sort();

    // Assign student numbers and question labels in alphabetical order of student names
    for (const studentName of sortedStudentNames) {
        studentNumbers[studentName] = studentCounter;
        const questions = questionsByStudent[studentName];
        questions.forEach((_, qIndex) => {
            const startingCode = 'a'.charCodeAt(0);
            const questionLabel = `${studentCounter}${String.fromCharCode(startingCode + qIndex)}`;
            questionLabels[questionIndex] = questionLabel;
            questionIndex++;
        });
        studentCounter++;
    }

    // Reorder questions so that they are grouped by student number
    const reorderedQuestions: PersonalizedQuestionsData[] = [];
    for (const studentName of sortedStudentNames) {
        reorderedQuestions.push(...questionsByStudent[studentName]);
    }

    // Create HTML for summary table of students and their questions
    const buildSummaryTable = (allStudentNames: string[]) => {

        // Get a sorted list of all students (those with and without questions)
        const allStudents: string[] = Array.from(new Set<string>([
            ...Object.keys(questionsByStudent),
            ...allStudentNames
        ])).sort();

        // Create row for each student, chooses color 
        // based on number of questions compared to mode
        const summaryRows = allStudents.map(student => {
            const count = studentQuestionCounts.get(student) || 0;
            const hasQuestions = count > 0;
            let color = Util.chooseQuestionColor(count, modeQuestions);
            const displayName = mapStudentName(student);
            return `
              <tr style="background-color: ${color}">
                  <td>${displayName}</td>
                  <td>${count}</td>
                  <td>${hasQuestions ? '✓' : '✗'}</td>
              </tr>
          `;
        }).join('');

        // HTML for the complete summary table
        return `
          <div id="summaryTableContainer" style="display: none; max-height: 300px; overflow-y: auto; margin-top: 20px;">
              <h2>Student Question Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                      <tr>
                          <th>Student Name</th>
                          <th>Question Count</th>
                          <th>Has Questions</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${summaryRows}
                  </tbody>
              </table>
          </div>
      `;
    };

    const truncateCharacters = (text: string, charLimit: number) => {
        return text.length > charLimit ? text.slice(0, charLimit) + '...' : text;
    };

    // Create HTML for the main questions table
    const questionsTable = reorderedQuestions.map((question, index) => {
        const studentName = extractStudentName(question.filePath, submissionRoot);
        const count = studentQuestionCounts.get(studentName) || 0;
        const labelColor = Util.chooseQuestionColor(count, modeQuestions);
        const filePathParts = question.filePath.split('/');
        let shortenedFilePath = filePathParts.length > 2
            ? `.../${filePathParts.slice(-3).join('/')}`
            : question.filePath;
        shortenedFilePath = truncateCharacters(shortenedFilePath, 30);

        const escapeHtmlAttr = (str: string) => {
            return String(str)
                .replace(/&/g, '&amp;')  // must go first
                .replace(/"/g, '&quot;') // double quotes
                .replace(/'/g, '&#39;')  // single quotes
                .replace(/</g, '&lt;')   // optional
                .replace(/>/g, '&gt;');  // optional
        };

        const highlightedCode = escapeHtmlAttr(question.highlightedCode);

        // HTML for each question row
        return `
          <tr id="row-${index}" data-index="${index}" data-label="${questionLabels[index]}" data-file="${shortenedFilePath}" data-code="${highlightedCode || 'No highlighted code'}" data-question="${question.text || 'No question'}">
              <td style="background-color: ${labelColor}">${questionLabels[index]}</td>
              <td title="${question.filePath}">${shortenedFilePath}</td>
              <td>
                  <textarea class="code-area" id="code-${index}">${highlightedCode || 'No highlighted code'}</textarea>
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

    // Create a Webview Panel for viewing personalized questions
    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
        'viewPersonalizedQuestions',
        'View Quiz Questions',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // Data passed to the mustache template
    const data = {
        totalQuestions: reorderedQuestions.length,
        summaryTable: buildSummaryTable(await allStudentsPromise),
        questionsTable: questionsTable,
        originalData: JSON.stringify(reorderedQuestions),
        questionLabels: JSON.stringify(questionLabels)

    };
    panel.webview.html = Util.renderMustache('quizQuestions.mustache.html', data);

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage((message) => {
        // Save button functionality
        if (message.type === 'saveChanges') {
            reorderedQuestions[message.index].highlightedCode = message.updatedCode;
            reorderedQuestions[message.index].text = message.updatedQuestion;
            logToFile('Re-assigning personalizedQuestonsData with reordered questions from saveChanges');
            state.personalizedQuestionsData = reorderedQuestions;
            Util.saveDataToFile('personalizedQuestions.json', state.personalizedQuestionsData);
            vscode.window.showInformationMessage('Changes saved successfully!');
        }

        // Exclude from quiz checkbox functionality
        if (message.type === 'toggleExclude') {
            reorderedQuestions[message.index].excludeFromQuiz = message.excludeStatus;
            logToFile('Re-assigning personalizedQuestonsData with reordered questions from toggleExclude');
            state.personalizedQuestionsData = reorderedQuestions;
            Util.saveDataToFile('personalizedQuestions.json', state.personalizedQuestionsData);
        }

        // Edit button functionality
        if (message.type === 'editQuestion') {
            vscode.window.showErrorMessage("Prepare openQuestionPanel and uncomment line below", message, { modal: true }, "OK");
            // openEditQuestionPanel(message.index);
        }

        // Refresh view button functionality
        if (message.type === 'refreshView') {
            panel.dispose();
            vscode.commands.executeCommand('gvqlc.viewQuizQuestions');
        }

        if (message.type === 'showInformationMessage') {
            vscode.window.showInformationMessage(message.message);
        }

        if (message.type === 'showErrorMessage') {
            vscode.window.showErrorMessage(message.message);
        }
    });
});