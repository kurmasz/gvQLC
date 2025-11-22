import * as vscode from 'vscode';
import path from 'path';

import * as gvQLC from '../gvQLC';
const state = gvQLC.state;

import TurndownService from 'turndown';
import * as pdf from 'html-pdf';

import { extractStudentName, loadDataFromFile, saveDataToFile } from '../utilities';
import * as Util from '../utilities';
import { quizQuestionsFileName, configFileName } from '../sharedConstants';

// Function to generate HTML quiz string export for a student
async function generateHTMLQuizExport(studentName: string, questions: any[]): Promise<string> {
    const config = await gvQLC.config();
    let retHTML = "";
    const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Export for ${studentName}</title>
  <style>
    .global-body {
      font-family: "Times New Roman", Times, serif;
      margin: 0px;
      padding: 0px;
    }
    .quiz-info {
      margin: 0 20px;
      .quiz-title {
        text-align: center;
        margin: 0;
      }
    }
    .quiz-body {
      margin: 0 20px;
      padding: 0;
      .quiz-question {

        .quiz-number {
          margin: 0;
          font-weight: bold;
        }
        .quiz-text {
          margin: 10px 20px;
        }
        .quiz-code {
          margin: 0 40px;
        }
        .quiz-answer {
          margin: 100px 20px 10px 20px;
          font-weight: bold;
        }
      }
    }
  </style>
</head>
<body class="global-body">`;

    const footer = `</body>
</html>`;
    retHTML += header;

    // Info section
    // TODO: add more info (date, instructor, course, etc.)
    let infoSection = `<div class="quiz-info">`;
    infoSection += `<h1 class="quiz-title">Quiz for ${studentName}</h1><hr>\n`;
    
    // potential features to add to config/menu later
    const dueDateFlag = true;
    const tempDueDate = "Due Date: ____________";
    if (dueDateFlag) {
        infoSection += `<p>${tempDueDate}</p>`;
    }
    const descFlag = true;
    const tempDesc = "Please answer the following questions based on your code submissions. Write your answers in the space provided.";
    if (descFlag) {
        infoSection += `<p>${tempDesc}</p>`;
    }

    infoSection += `</div>`;
    retHTML += infoSection;

    // Questions section
    let quizBody = `<div class="quiz-body">`;
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        let questionBlock = `<div class="quiz-question">`;
        const fileName = "File: " + path.basename(question.filePath);
        const lineRange = "Lines: " + question.startLine + "-" + question.endLine;
        const colRange = "Start col: " + question.startCol + ", End col: " + question.endCol;
        questionBlock += `<p class="quiz-number">${i + 1}. ${fileName}, ${lineRange}, ${colRange}</p>`;
        questionBlock += `<p class="quiz-text">${question.question}</p>`;
        questionBlock += `<pre class="quiz-code"><code>${question.codeContext}</code></pre>`;
        questionBlock += `<br>`;
        // Include answer if flag is set
        if (config.includeAnswersFlag) {
            questionBlock += `<p class="quiz-answer">Answer: ${question.answer}</p>`;
        }
        questionBlock += `</div>`;
        quizBody += questionBlock;
        //page break after each question
        quizBody += `<div style="page-break-after: always;"></div>`;
    }
    quizBody += `</div>`;
    retHTML += quizBody;
    retHTML += footer;
    return retHTML;
}

// Function to generate HTML quiz for all students in one file
// lots of repeated code from above, refactor needed, but func needed for now
async function generateAllHTMLQuizExport(studentQuestionsMap: Record<string, any[]>): Promise<string> {
    const config = await gvQLC.config();
    let retHTML = "";
    const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Export for all students</title>
  <style>
    .global-body {
      font-family: "Times New Roman", Times, serif;
      margin: 0px;
      padding: 0px;
    }
    .quiz-info {
      margin: 0 20px;
      .quiz-title {
        text-align: center;
        margin: 0;
      }
    }
    .quiz-body {
      margin: 0 20px;
      padding: 0;
      .quiz-question {

        .quiz-number {
          margin: 0;
          font-weight: bold;
        }
        .quiz-text {
          margin: 10px 20px;
        }
        .quiz-code {
          margin: 0 40px;
        }
        .quiz-answer {
          margin: 100px 20px 10px 20px;
          font-weight: bold;
        }
      }
    }
  </style>
</head>
<body class="global-body">`;
    retHTML += header;
    const footer = `</body>
</html>`;


    for (const studentName in studentQuestionsMap) {
        // Info section
        // TODO: add more info (date, instructor, course, etc.)
        let infoSection = `<div class="quiz-info">`;
        infoSection += `<h1 class="quiz-title">Quiz for ${studentName}</h1><hr>\n`;
        const dueDateFlag = true;
        const tempDueDate = "Due Date: ____________";
        if (dueDateFlag) {
            infoSection += `<p>${tempDueDate}</p>`;
        }
        const descFlag = true;
        const tempDesc = "Please answer the following questions based on your code submissions. Write your answers in the space provided.";
        if (descFlag) {
            infoSection += `<p>${tempDesc}</p>`;
        }
        infoSection += `</div>`;
        retHTML += infoSection;

        // may be able to add whole sec from other func here for now
        // Questions section
        let questions = studentQuestionsMap[studentName];
        let quizBody = `<div class="quiz-body">`;
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            let questionBlock = `<div class="quiz-question">`;
            const fileName = "File: " + path.basename(question.filePath);
            const lineRange = "Lines: " + question.startLine + "-" + question.endLine;
            const colRange = "Start col: " + question.startCol + ", End col: " + question.endCol;
            questionBlock += `<p class="quiz-number">${i + 1}. ${fileName}, ${lineRange}, ${colRange}</p>`;
            questionBlock += `<p class="quiz-text">${question.question}</p>`;
            questionBlock += `<pre class="quiz-code"><code>${question.codeContext}</code></pre>`;
            questionBlock += `<br>`;
            // Include answer if flag is set
            if (config.includeAnswersFlag) {
                questionBlock += `<p class="quiz-answer">Answer: ${question.answer}</p>`;
            }
            questionBlock += `</div>`;
            quizBody += questionBlock;
            //page break after each question
            quizBody += `<div style="page-break-after: always;"></div>`;
        }
        quizBody += `</div>`;
        retHTML += quizBody;

    }
    retHTML += footer;
    return retHTML;
}

function convertHTMLToMarkdown(htmlContent: string): string {
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(htmlContent);
    if (!markdown) {
        vscode.window.showErrorMessage('Error converting HTML to Markdown.');
        return '';
    }
    return markdown;
}

async function convertHTMLToPdf(htmlContent: string, fileName: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
    }
    const uri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${fileName}`);
    const options: pdf.CreateOptions = { format: 'A4' };
    pdf.create(htmlContent, options).toFile(uri.fsPath, function(err, res) {
        if (err) {
            return console.log(err);
        }
    });
}

export const exportQuizCommand = vscode.commands.registerCommand('gvqlc.exportQuiz', async () => {
    if (!Util.loadPersistedData()) {
        console.log('Could not load data');
        return false;
    }

    if (state.personalizedQuestionsData.length === 0) {
        vscode.window.showInformationMessage('No personalized questions added yet!');
        return;
    }

    const config = await gvQLC.config();
    const submissionRoot = config.submissionRoot;

    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
        'exportMenu',
        'Export Menu',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // vvv purpose of this was to keep the radio buttons in sync with config, but not working
    // put relevant config in here
    const data = {
        configData: config
    };

    panel.webview.html = Util.renderMustache('exportQuiz.mustache.html', data);

    // need way to update config
    // from menu
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'exportQuiz') {
            // TODO: Consider output location, and if file already exists
            // TODO: Figure out how to output to new folder for this class/assignment (prompt on export?)
            // this function will be our paper test export feature
            // either exporting to .md or .pdf
            // it will extract students as well as their questions
            // from the JSON as vars in a loop so we can format it nicely
            // Eventually, we will create a folder with date and optional
            // quiz name, with .md folder with a separate page for each
            // student inside, or a single .pdf with all students' quizzes,
            // or an .md for each student in a single folder.

            //file is imported from shared constants at top of file
            // create object of file data
            const fileData = loadDataFromFile(quizQuestionsFileName);
            // vvv could potentially use below, like in viewQuizCommand
            // vvv haven't tested if in same format
            //const fileData = state.personalizedQuestionsData;

            if (!fileData) {
                vscode.window.showErrorMessage('No personalized questions data found to export.');
                return;
            }
            if (fileData.length === 0) {
                vscode.window.showErrorMessage('No personalized questions data found to export.');
                return;
            }
            
            // since our json is stored question-wise, we need to reorganize it student-wise
            interface QuizQuestion {
                filePath: string;
                codeContext: string;
                question: string;
                answer: string;
                startLine: number;
                startCol: number;
                endLine: number;
                endCol: number;
            }
            let studentQuestionsMap: Record<string, QuizQuestion[]> = {};
            for (const questionIndex in fileData) {
                if (!fileData[questionIndex].excludeFromQuiz) {
                    const extractedName = extractStudentName(fileData[questionIndex].filePath, submissionRoot);
                    if (!studentQuestionsMap[extractedName]) {
                        studentQuestionsMap[extractedName] = [];
                    }
                    studentQuestionsMap[extractedName].push({
                        filePath: fileData[questionIndex].filePath,
                        codeContext: fileData[questionIndex].highlightedCode,
                        question: fileData[questionIndex].text,
                        answer: fileData[questionIndex].answer,
                        startLine: fileData[questionIndex].range.start.line,
                        startCol: fileData[questionIndex].range.start.character,
                        endLine: fileData[questionIndex].range.end.line,
                        endCol: fileData[questionIndex].range.end.character,
                    });
                }
            }

            if (config.singlePageFlag) {
                const htmlContent = await generateAllHTMLQuizExport(studentQuestionsMap);
                const fileNameHTML = `quiz_all_students.html`;
                if (config.markdownFlag) {
                    // Haven't found a way to implement page breaks in md yet
                    const markdownContent = convertHTMLToMarkdown(htmlContent);
                    if (markdownContent === '') {
                        vscode.window.showErrorMessage('Error converting HTML to Markdown. Export aborted.');
                        return;
                    }
                    const fileNameMD = `quiz_all_students.md`;
                    await saveDataToFile(fileNameMD, markdownContent, false);
                } else if (config.pdfFlag) {
                    const fileNamePDF = `quiz_all_students.pdf`;
                    await convertHTMLToPdf(htmlContent, fileNamePDF);
                } else {
                    await saveDataToFile(fileNameHTML, htmlContent, false);
                }
            } else {
                for (const student in studentQuestionsMap) {
                    const htmlContent = await generateHTMLQuizExport(student, studentQuestionsMap[student]);
                    const safeStudentName = student.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const fileNameHTML = `quiz_${safeStudentName}.html`;
                    if (config.markdownFlag) {
                        const markdownContent = convertHTMLToMarkdown(htmlContent);
                        if (markdownContent === '') {
                            vscode.window.showErrorMessage('Error converting HTML to Markdown. Export aborted.');
                            return;
                        }
                        const fileNameMD = `quiz_${safeStudentName}.md`;
                        await saveDataToFile(fileNameMD, markdownContent, false);
                    } else if (config.pdfFlag) {
                        const fileNamePDF = `quiz_${safeStudentName}.pdf`;
                        await convertHTMLToPdf(htmlContent, fileNamePDF);
                    } else {
                        await saveDataToFile(fileNameHTML, htmlContent, false);
                    }
                }
            }
        }

        // saving config is relatively useless at the moment
        // it is overwritten on every export anyway
        // goal was to have the config menu reflect current config
        // but that isn't working yet
        if (message.type === 'enableMarkdown') {
            config.pdfFlag = false;
            config.markdownFlag = true;
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'enablePdf') {
            config.markdownFlag = false;
            config.pdfFlag = true;
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'enableHtml') {
            config.markdownFlag = false;
            config.pdfFlag = false;
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'enableSinglePage') {
            config.singlePageFlag = true;
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'disableSinglePage') {
            config.singlePageFlag = false;
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'enableIncludeAnswers') {
            config.includeAnswersFlag = true;
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'disableIncludeAnswers') {
            config.includeAnswersFlag = false;
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
    });
});