


import * as vscode from 'vscode';
import path from 'path';

import * as gvQLC from '../gvQLC';
const state = gvQLC.state;

import { extractStudentName, loadDataFromFile, saveDataToFile, generateHTMLQuizExport, generateAllHTMLQuizExport, convertHTMLToMarkdown } from '../utilities';
import * as Util from '../utilities';
import { PersonalizedQuestionsData } from '../types';
import { logToFile } from '../fileLogger';
import { stringify } from 'querystring';
import { quizQuestionsFileName } from '../sharedConstants';

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

    // put relevant config in here
    const data = {
        
    };
    panel.webview.html = Util.renderMustache('exportQuiz.mustache.html', data);
    
    // need way to update config
    // from menu
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'exportQuiz') {
            console.log("test");
            // TODO: Implement styling for button
            // TODO: Implement formatting for exported quiz
            // TODO: Implement a try in case the file is not found or empty
            // TODO: Implement a menu with options for export format and what to do with answer key
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

            const markdownFlag = false;
            const pdfFlag = false;
            const singlePageFlag = false;
            if (singlePageFlag) {
                const htmlContent = generateAllHTMLQuizExport(studentQuestionsMap);
                const fileNameHTML = `quiz_all_students.html`;
                if (markdownFlag) {
                    // Haven't found a way to implement page breaks in md yet
                    const markdownContent = convertHTMLToMarkdown(htmlContent);
                    const fileNameMD = `quiz_all_students.md`;
                    saveDataToFile(fileNameMD, markdownContent, false);
                } else if (pdfFlag) {
                    // vvv placeholder for logic skeleton
                    saveDataToFile(fileNameHTML, htmlContent, false);
                } else {
                    saveDataToFile(fileNameHTML, htmlContent, false);
                }
            } else {
                for (const student in studentQuestionsMap) {
                    const htmlContent = generateHTMLQuizExport(student, studentQuestionsMap[student]);
                    const safeStudentName = student.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const fileNameHTML = `quiz_${safeStudentName}.html`;
                    if (markdownFlag) {
                        const markdownContent = convertHTMLToMarkdown(htmlContent);
                        const fileNameMD = `quiz_${safeStudentName}.md`;
                        saveDataToFile(fileNameMD, markdownContent, false);
                    } else if (pdfFlag) {
                        // vvv placeholder for logic skeleton
                        saveDataToFile(fileNameHTML, htmlContent, false);
                    } else {
                        saveDataToFile(fileNameHTML, htmlContent, false);
                    }
                }
            }
        }
    });
});