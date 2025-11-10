


import * as vscode from 'vscode';
import path from 'path';

import * as gvQLC from '../gvQLC';
const state = gvQLC.state;

import TurndownService from 'turndown';

//import { extractStudentName, loadDataFromFile, saveDataToFile, generateHTMLQuizExport, generateAllHTMLQuizExport, convertHTMLToMarkdown } from '../utilities';
import { extractStudentName, loadDataFromFile, saveDataToFile } from '../utilities';
import * as Util from '../utilities';
import { PersonalizedQuestionsData } from '../types';
import { logToFile } from '../fileLogger';
import { stringify } from 'querystring';
import { quizQuestionsFileName, configFileName } from '../sharedConstants';

import html_to_pdf from "html-pdf-node";

// Function to generate HTML quiz string export for a student
async function generateHTMLQuizExport(studentName: string, questions: any[]): Promise<string> {
    // vvv may need await
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
        //const sampleFileName = "File: " + "test.py";
        const fileName = "File: " + path.basename(question.filePath);
        //const sampleLineRange = "Lines: " + "1-10";
        const lineRange = "Lines: " + question.startLine + "-" + question.endLine;
        const colRange = "Start col: " + question.startCol + ", End col: " + question.endCol;
        //const sampleColRange = "Columns: " + "1-20";
        //questionBlock += `<p class="quiz-number">${i + 1}. <span>${sampleFileName} ${sampleLineRange}</span></p>`;
        questionBlock += `<p class="quiz-number">${i + 1}. ${fileName}, ${lineRange}, ${colRange}</p>`;
        questionBlock += `<p class="quiz-text">${question.question}</p>`;
        questionBlock += `<pre class="quiz-code"><code>${question.codeContext}</code></pre>`;
        questionBlock += `\n\n\n`;
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
    //retHTML += 
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
            //const sampleFileName = "File: " + "test.py";
            const fileName = "File: " + path.basename(question.filePath);
            //const sampleLineRange = "Lines: " + "1-10";
            const lineRange = "Lines: " + question.startLine + "-" + question.endLine;
            const colRange = "Start col: " + question.startCol + ", End col: " + question.endCol;
            //const sampleColRange = "Columns: " + "1-20";
            //questionBlock += `<p class="quiz-number">${i + 1}. <span>${sampleFileName} ${sampleLineRange}</span></p>`;
            questionBlock += `<p class="quiz-number">${i + 1}. ${fileName}, ${lineRange}, ${colRange}</p>`;
            questionBlock += `<p class="quiz-text">${question.question}</p>`;
            questionBlock += `<pre class="quiz-code"><code>${question.codeContext}</code></pre>`;
            questionBlock += `\n\n\n`;
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



    //   for (const studentName in studentQuestionsMap) {
    //     const questions = studentQuestionsMap[studentName];
    //     retHTML += `<h1>Quiz for ${studentName}</h1>\n`;
    //     for (let i = 0; i < questions.length; i++) {
    //       const question = questions[i];
    //       retHTML += `<div class="question-block">\n`;
    //       retHTML += `<h2>Question ${i + 1}:</h2>\n`;
    //       retHTML += `<pre><code>${question.codeContext}</code></pre>\n`;
    //       retHTML += `<p>${question.question}</p>\n`;
    //       retHTML += `</div>\n<hr>\n`;
    //     }
    //     retHTML += `<div class="page-break">&nbsp;</div>\n`;
    //   }
    //   retHTML += `</body>
    // </html>`;
    return retHTML;
}

// Function to convert HTML to Markdown
function convertHTMLToMarkdown(htmlContent: string): string {
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(htmlContent);
    return markdown;
}

async function convertHTMLToPdf(htmlContent: string): Promise<any> {
    const options = { format: 'A4' };
    const file = { content: htmlContent };
    return html_to_pdf.generatePdf(file, options);
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

    //config bug may be because no config is created at curr loc it looks for
    //config empty
    console.log(config);


    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
        'exportMenu',
        'Export Menu',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // put relevant config in here
    const data = {
        configData: config
    };
    panel.webview.html = Util.renderMustache('exportQuiz.mustache.html', data);

    // need way to update config
    // from menu
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'exportQuiz') {
            // TODO: Implement a try in case the file is not found or empty
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
            //type QuestionJSON = {filePath: string, range: any, text: string, highlightedCode: string, answer: string, excludeFromQuiz: boolean};
            let studentQuestionsMap: Record<string, QuizQuestion[]> = {};
            for (const questionIndex in fileData) {
                // note: consider including range for line numbers (if that is what it means)
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
                    const fileNameMD = `quiz_all_students.md`;
                    saveDataToFile(fileNameMD, markdownContent, false);
                } else if (config.pdfFlag) {
                    // vvv need new lib for pdfs, look at above func
                    const pdfContent = await convertHTMLToPdf(htmlContent);
                    const fileNamePDF = `quiz_all_students.pdf`;
                    await saveDataToFile(fileNamePDF, pdfContent, false);
                    //
                    saveDataToFile(fileNameHTML, htmlContent, false);
                } else {
                    saveDataToFile(fileNameHTML, htmlContent, false);
                }
            } else {
                for (const student in studentQuestionsMap) {
                    const htmlContent = await generateHTMLQuizExport(student, studentQuestionsMap[student]);
                    const safeStudentName = student.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const fileNameHTML = `quiz_${safeStudentName}.html`;
                    if (config.markdownFlag) {
                        const markdownContent = convertHTMLToMarkdown(htmlContent);
                        const fileNameMD = `quiz_${safeStudentName}.md`;
                        saveDataToFile(fileNameMD, markdownContent, false);
                    } else if (config.pdfFlag) {
                        // vvv placeholder for logic skeleton
                        const pdfContent = await convertHTMLToPdf(htmlContent);
                        const fileNamePDF = `quiz_${safeStudentName}.pdf`;
                        await saveDataToFile(fileNamePDF, pdfContent, false);
                        //
                        saveDataToFile(fileNameHTML, htmlContent, false);
                    } else {
                        saveDataToFile(fileNameHTML, htmlContent, false);
                    }
                }
            }
        }

        if (message.type === 'enableMarkdown') {
            config.pdfFlag = false;
            config.markdownFlag = true;
            console.log("enable md");
            // save to file in all of these here
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        // if (message.type === 'disableMarkdown') {
        //     config.markdownFlag = false;
        // }
        if (message.type === 'enablePdf') {
            config.markdownFlag = false;
            config.pdfFlag = true;
            console.log("enable pdf");
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        // if (message.type === 'disablePdf') {
        //     config.pdfFlag = false;
        // }
        if (message.type === 'enableHtml') {
            config.markdownFlag = false;
            config.pdfFlag = false;
            console.log("enable html");
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        // if (message.type === 'disableHtml') {
        //     // N/A
        // }
        if (message.type === 'enableSinglePage') {
            config.singlePageFlag = true;
            console.log("enable single page");
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'disableSinglePage') {
            config.singlePageFlag = false;
            console.log("disable single page");
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'enableIncludeAnswers') {
            config.includeAnswersFlag = true;
            console.log("enable include answers");
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
        if (message.type === 'disableIncludeAnswers') {
            config.includeAnswersFlag = false;
            console.log("disable include answers");
            await saveDataToFile(configFileName, JSON.stringify(config, null, 2), false);
        }
    });
});