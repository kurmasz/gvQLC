/************************************************************************************
 * 
 * viewQuizQuestions.ts
 * 
 * The viewQuizQuestions command.
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';
import path from 'path';

import * as gvQLC from '../gvQLC';
const state = gvQLC.state;

import { extractStudentName, loadDataFromFile, saveDataToFile, generateHTMLQuizExport } from '../utilities';
import * as Util from '../utilities';
import { PersonalizedQuestionsData } from '../types';
import { logToFile } from '../fileLogger';
import { stringify } from 'querystring';
import { quizQuestionsFileName } from '../sharedConstants';
import { getLLMProvider } from '../llm/llmConfig';
import * as fs from 'fs/promises';
import { readFileSync, readdirSync } from 'fs';


/**
 * Generates a quiz question from code using the LLM
 */
async function generateQuestionFromCode(code: string): Promise<string> {
    try {
        // Load the prompt template from the extension's directory
        // In development: extensionPath/src/llm/prompts/generateQuestion.json
        // In production: extensionPath/out/src/llm/prompts/generateQuestion.json
        const ctx = gvQLC.context();
        let promptPath = path.join(ctx.extensionPath, 'out', 'src', 'llm', 'prompts', 'generateQuestion.json');
        
        // Fallback to src/ for development/debugging
        try {
            await fs.access(promptPath);
        } catch {
            promptPath = path.join(ctx.extensionPath, 'src', 'llm', 'prompts', 'generateQuestion.json');
        }
        
        const promptContent = await fs.readFile(promptPath, 'utf-8');
        const promptTemplate = JSON.parse(promptContent);

        // Replace the code placeholder in the user prompt
        const userPrompt = promptTemplate.user.replace('{{code}}', code);

        // Get the appropriate LLM provider based on configuration
        const provider = await getLLMProvider(gvQLC.context());

        // Generate the completion
        const response = await provider.generateCompletion([
            { role: 'system', content: promptTemplate.system },
            { role: 'user', content: userPrompt }
        ]);

        return response.content;
    } catch (error) {
        console.error('Error generating question from code:', error);
        throw new Error(`Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function rephraseQuestionFromCode(code: string, question: string): Promise<string> {
    try {
        // Load the prompt template from the extension's directory
        // In development: extensionPath/src/llm/prompts/rephraseQuestion.json
        // In production: extensionPath/out/src/llm/prompts/rephraseQuestion.json
        const ctx = gvQLC.context();
        let promptPath = path.join(ctx.extensionPath, 'out', 'src', 'llm', 'prompts', 'rephraseQuestion.json');
        
        // Fallback to src/ for development/debugging
        try {
            await fs.access(promptPath);
        } catch {
            promptPath = path.join(ctx.extensionPath, 'src', 'llm', 'prompts', 'rephraseQuestion.json');
        }
        
        const promptContent = await fs.readFile(promptPath, 'utf-8');
        const promptTemplate = JSON.parse(promptContent);

        // Replace the code placeholder in the user prompt
        var userPrompt = promptTemplate.user.replace('{{code}}', code).replace('{{originalQuestion}}', question);

        // Get the appropriate LLM provider based on configuration
        const provider = await getLLMProvider(gvQLC.context());

        // Generate the completion
        const response = await provider.generateCompletion([
            { role: 'system', content: promptTemplate.system },
            { role: 'user', content: userPrompt }
        ]);

        return response.content;
    } catch (error) {
        console.error('Error generating question from code:', error);
        throw new Error(`Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function getfiles() {
    // Get all file paths to student files
    // Assume Root Directory --> Student Folders --> Student Code Files
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let contents = new Array;
    if (workspaceFolders) {
        const folders = await fs.readdir(workspaceFolders[0].uri.fsPath);
        var subfolders = new Array;
        var count = 0;
        const ignoreList = ['.gitignore', '.vscode', 'backup_personalizedQuestions.json', 'code-review.csv', 'gvQLC.config.json', 'gvQLC.quizQuestions.json', 'personalizedQuestions.json', 'personalizedQuestions.json.new', 'personalizedQuestions.json.safe', 'userSettings.json'];
        folders.forEach(async folder => {
            if (!(ignoreList.includes(folder))) {
                subfolders.push(folder);
                const subcontents = readdirSync(`${workspaceFolders[0].uri.fsPath}\\${folder}`);
                const filtered = subcontents.filter(element => !ignoreList.includes(element));
                filtered.forEach(element => {
                    contents.push(`${workspaceFolders[0].uri.fsPath}\\${folder}\\${element}`);
                });
            };
        });
    };
    return contents;
}

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
    
    /*const allFiles = await getfiles();
    console.log(allFiles);

    const allContents = new Map<string, string>();
    allFiles.forEach(async element => {
        const stats = await fs.stat(element);
        if (stats.isFile()) {
            const buffer = readFileSync(element);
            const contents = Buffer.from(buffer).toString('utf8');
            allContents.set(element, contents);
        };
    });
    */
    /* Remaining Tasks
    Prompt AI with file, code to find, question to add
    Response should have start line and char, end line and char
    Make JSON from responses akin to addQuizQuestion but saved to different file
    Make way to view said JSON
    */

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
              <tr onclick="filterByName('${displayName}')" style="background-color: ${color}">
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
              <td>
                  <span class="filepath" onclick="openFileAt(${index})">${shortenedFilePath}</span>
                  <br>
                  <textarea class="code-area" id="code-${index}">${highlightedCode || 'No highlighted code'}</textarea>
              </td>
              <td>
                  <br>
                  <textarea class="question-area" id="question-${index}">${question.text || 'No question'}</textarea>
                  <textarea class="question-area" id="ai-${index}" style="display: none;">'No question'</textarea>
              </td>
              <td title="${question.filePath}">
                  <button onclick="saveChanges(${index})">Save</button>
                  <button onclick="revertChanges(${index})" style="background-color: orange; color: white;">Revert</button>
                  <button onclick="editQuestion(${index})" style="background-color: green; color: white;">Edit</button>
                  <button onclick="copyQuestionText(${index})" style="background-color: #2196F3; color: white;">Copy</button>
                  <button onclick="deleteQuestion(${index})" style="background-color: #f321bbff; color: white;">Delete</button>
                  <button onclick="aiSuggestQuestion(${index})" style="background-color: grey; color: white;">Generate</button>
                  <button onclick="aiRephraseQuestion(${index})" style="background-color: #9b0974ff; color: white;">Rephrase</button>
                  <button id="acceptAI" onclick="acceptOutput(${index})" style="background-color: #092b9bff; color: white;">Accept AI</button>
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

    const settingUri = vscode.Uri.file(`${vscode.workspace.workspaceFolders?.[0]?.uri.fsPath}/userSettings.json`);
        try {
            await vscode.workspace.fs.stat(settingUri);
        } catch (error) {
            await Util.saveUserSettingsFile('userSettings.json', 'normal', 'normal');
        }
        var darkMode = "";
        var contrastMode = "";
        const settingBytes = await vscode.workspace.fs.readFile(settingUri);
        const settingsString = Buffer.from(settingBytes).toString('utf8');
        const settingsJSON = await JSON.parse(settingsString);
        darkMode = settingsJSON.darkMode;
        contrastMode = settingsJSON.contrastMode;

    // Data passed to the mustache template
    const data = {
        totalQuestions: reorderedQuestions.length,
        summaryTable: buildSummaryTable(await allStudentsPromise),
        questionsTable: questionsTable,
        originalData: JSON.stringify(reorderedQuestions),
        questionLabels: JSON.stringify(questionLabels),
        darkMode: darkMode,
        contrastMode: contrastMode

    };
    panel.webview.html = Util.renderMustache('quizQuestions.mustache.html', data);

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage(async (message) => {
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

        if (message.type === 'deleteQuestion') {
            var newQuestions = reorderedQuestions.filter((item) => !(item === reorderedQuestions[message.index]));
            vscode.window.showErrorMessage(`${newQuestions.length}`);
            state.personalizedQuestionsData = newQuestions;
            Util.saveDataToFile('personalizedQuestions.json', state.personalizedQuestionsData);
            panel.dispose();
            vscode.commands.executeCommand('gvqlc.viewQuizQuestions');
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

        if (message.type === 'openFileAt') {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) {
                vscode.window.showErrorMessage("Open a workspace folder first.");
                return;
            }
            var questionDetails = reorderedQuestions.filter((item) => (item === reorderedQuestions[message.index]));
            const fullPath = path.join(root, questionDetails[0].filePath);
            try {
                const doc = await vscode.workspace.openTextDocument(fullPath);
                const editor = await vscode.window.showTextDocument(doc, { preview: false });
                const posStart = new vscode.Position(questionDetails[0].range.start.line, questionDetails[0].range.start.character);
                const posEnd = new vscode.Position(questionDetails[0].range.end.line, questionDetails[0].range.end.character);
                editor.revealRange(new vscode.Range(posStart, posEnd), vscode.TextEditorRevealType.InCenter);
                editor.selection = new vscode.Selection(posStart, posEnd);
            } catch (e) {
                vscode.window.showErrorMessage("Could not open file: " + String(e));
            }
        }

        if (message.type === 'generateQuestion') {
            try {
                // Use the LLM to generate a question from the code
                const generatedContent = await generateQuestionFromCode(message.code);
                
                // Send the response back to the webview
                panel.webview.postMessage({
                    type: 'aiResponse',
                    content: generatedContent,
                    index: message.index
                });
            } catch (error) {
                console.error('Error generating question:', error);
                
                // Send error back to the webview
                panel.webview.postMessage({
                    type: 'aiError',
                    error: error instanceof Error ? error.message : 'Unknown error occurred',
                    index: message.index
                });
            }
        }

        if (message.type === 'rephraseQuestion') {
            try {
                // Use the LLM to generate a question from the code
                const generatedContent = await rephraseQuestionFromCode(message.code, message.question);
                
                // Send the response back to the webview
                panel.webview.postMessage({
                    type: 'aiResponse',
                    content: generatedContent,
                    index: message.index
                });
            } catch (error) {
                console.error('Error rephrasing question:', error);
                
                // Send error back to the webview
                panel.webview.postMessage({
                    type: 'aiError',
                    error: error instanceof Error ? error.message : 'Unknown error occurred',
                    index: message.index
                });
            }
        }

        if (message.type === 'alterUserSettings') {
            await Util.saveUserSettingsFile('userSettings.json', message.darkMode, message.contrastMode);
        }
        
        if (message.type === 'exportQuiz') {
            // TODO: Implement export functionality
            // TODO: Implement styling for button
            // TODO: Implement formatting for exported quiz
            // TODO: Implement a try in case the file is not found or empty
            // TODO: Implement a menu with options for export format and what to do with answer key
            // TODO: Consider output location, and if file already exists
            // TODO: Figure out how to output to new folder for this class/assignment (prompt on export?)
            // this function will be our paper test export feature
            // either exporting to .md or .pdf
            // for now, just will convert JSON to .md
            // it will extract students as well as their questions
            // from the JSON as vars in a loop so we can format it nicely
            // Eventually, we will create a folder with date and optional
            // quiz name, with .md folder with a separate page for each
            // student inside, or a single .pdf with all students' quizzes,
            // or an .md for each student in a single folder.
            
            //file is imported from shared constants at top of file
            // create object of file data
            const fileData = loadDataFromFile(quizQuestionsFileName);
            //vscode.window.showInformationMessage('Exporting quiz questions:', fileData);
            interface  QuizQuestion {
                filePath: string;
                codeContext: string;
                question: string;
                answer: string;
            }
            type QuestionJSON = {filePath: string, range: any, text: string, highlightedCode: string, answer: string, excludeFromQuiz: boolean};
            let studentQuestionsMap: Record<string, QuizQuestion[]> = {};
            for(const questionIndex in fileData) {
                // note: consider including range for line numbers (if that is what it means)
                // section to parse from json
                if (!fileData[questionIndex].excludeFromQuiz) {
                    // TODO: find a way to separate file name to display on quiz
                    const extractedName = extractStudentName(fileData[questionIndex].filePath, submissionRoot);
                    if (!studentQuestionsMap[extractedName]) {
                        studentQuestionsMap[extractedName] = [];
                    }
                    studentQuestionsMap[extractedName].push({
                        filePath: fileData[questionIndex].filePath,
                        codeContext: fileData[questionIndex].highlightedCode,
                        question: fileData[questionIndex].text,
                        answer: fileData[questionIndex].answer
                    });
                }
            }
            // end section to parse from json

            let quizExport = '';
            // note: not all formats will be created, just here for future reference
            // section to handle export flags/options
            // end section to handle export flags/options

            // section to create html format
            for (const student in studentQuestionsMap) {
                const htmlContent = generateHTMLQuizExport(student, studentQuestionsMap[student]);
                const safeStudentName = student.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fileName = `quiz_${safeStudentName}.html`;
                saveDataToFile(fileName, htmlContent, false);
                //console.log(`Exported quiz for ${student} to ${fileName}`);
            }   
            // end section to create html format

            // note: research how to convert html to md
            // section to create md format
            // end section to create md format
            
            // note: research pdf libraries and conversion from md/html to pdf
            // section to create pdf format
            // end section to create pdf format

            // note: use flags to determine how to export
            // note: ref utils for saving files
            // section to output to file
            // end section to output to file
            //console.log('Student Questions Map:', studentQuestionsMap);
        }
    });
});