
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

import { state, config, context } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';
import { getLLMProvider } from '../llm/llmConfig';

import type { PersonalizedQuestionsData } from '../types';

function locateSnippetInCode(snippet: string, fullCode: string): { startLine: number, startCol: number, endLine: number, endCol: number }{
    // placeholder function to locate snippet in full code
    // implement logic to find line and column numbers

    // regex to verify snippet exists in fullCode
    const snippetIndex = fullCode.indexOf(snippet);
    if (snippetIndex !== -1) {
        const beforeSnippet = fullCode.slice(0, snippetIndex);
        const snippetLines = snippet.split('\n');
        
        const startLine = beforeSnippet.split('\n').length;
        const startCol = beforeSnippet.split('\n').pop()!.length + 1;
        const endLine = startLine + snippetLines.length - 1;
        const endCol = snippetLines.length === 1 ? startCol + snippet.length : snippetLines[snippetLines.length - 1].length + 1;

        return { startLine, startCol, endLine, endCol };
    }

    // need new logic to handle not found case
    return { startLine: 0, startCol: 0, endLine: 0, endCol: 0 };
}

function parseLLMOutput(output: string): string[] {
    // placeholder function to parse LLM output into array of questions
    // implement parsing logic based on expected output format
    
    // look for "Question: " delimiters to split questions
    const questionBlocks = output.split('Question: ').slice(1); // first split is before first question
    const questions: string[] = [];
    
    for (const block of questionBlocks) {
        const questionText = block.split('Code Context Snippet: ')[0].trim();
        const codeSnippet = block.split('Code Context Snippet: ')[1]?.split('Answer: ')[0].trim() || '';
        const answerText = block.split('Answer: ')[1]?.trim() || '';

        const fullcodeTemp = '';
        const range = locateSnippetInCode(codeSnippet, fullcodeTemp); // need full code here
        //NOT DONE, STOPPING HERE
    }
    //let formattedQuestion: PersonalizedQuestionsData;
    // file path needs to be determined from main func

    return [];
}

// use one LLM call to generate multiple questions
// vvv figure out output format/type
async function generateAllInOne(code: string, userPrompt: string, numQuestions: number): Promise<string[]> {
    // need to figure out how to format everything
    // prompts have their own files
    // refer to addQuizQuestion.ts for llm output handling
    // LLMResponse type has content: string field,
    // will need to parse that string into multiple questions and json data
    // think about how to use prompt engineering here and how to check for discrepancies

    // probably output as an array of json questions that can be
    // pushed to our state and saved to our quiz json

    // For parsing output:
    // - planning on having llm include formatted response with:
    //   Question: ...
    //   Code Context Snippet: ...
    //   Answer: ...
    //   Question: ...
    //   Code Context Snippet: ...
    //   Answer: ...
    // - split by "Question: " to get individual questions
    // - for each question block, extract code snippet and answer
    // - use regex or string methods
    // - find location of snippet in original code for line and col info
    // - create question objects and push to array, formatted like our json

    // For finding snippet location:
    // - use indexOf to find start of snippet in full code
    // - count newlines before that index for line number
    // - find last newline before index for column number
    // - store line and col in question object

    // For prompt engineering:
    // - use free gpt and manually test this process to find semi-reliable prompt
    //   that has expected output format somewhere in the output
    // - need one prompt for multiple questions generation
    // - need one prompt for retrying if parsing fails
    // - may use one prompt for doing a single question at a time,
    //   with deliniated code claimed by prev llm call
    
    // Pseudocode:
    /*
    const provider = await getLLMProvider(context());
    const response = await provider.generateCompletion([
        { role: 'system', content: 'You are a helpful assistant that generates quiz questions from code snippets.' },
        { role: 'user', content: `Generate ${numQuestions} quiz questions from the following code:\n\n${code}\n\n${userPrompt}` }
    ]);

    const output = response.content;
    // Parse output into questions array
    const questions: string[] = parseQuestionsFromOutput(output, code);
    return questions;
    */


    return [];
}

export const generateQuestionsCommand = vscode.commands.registerCommand('gvqlc.generateQuestions', async () => {
    if (!Util.loadPersistedData()) {
        return;
    }
    
    // Make sure student file is open
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('gvQLC: No active editor tab found. (You must have a code snippet selected to add a quiz question.)');
        vscode.window.setStatusBarMessage(
            "gvQLC: No active editor tab. (You must have a code snippet selected to add a quiz question.)",
            7000
        );
        return;
    }

    // Get whole document text from student's file
    const studentCode = editor.document.getText();
    // vvv check if length actually works here
    if (!studentCode || studentCode.length === 0) {
        vscode.window.showErrorMessage('gvQLC: The active document is empty. Please open a file with code to generate quiz questions.');
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'generateQuestions',
        'Generate Quiz Questions',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );
    
    // may not need this passed in
    // vvv figure out how to store this
    let generatedQuestions = null;
    const htmlData = {
        questions: generatedQuestions
    };
    panel.webview.html = Util.renderMustache('generateQuestions.mustache.html', htmlData);

    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'generate') {
            // vvv assign to our state questions var
            //generateAllInOne(studentCode, message.userPrompt, message.numQuestions);
            const generatedQuestions = "test q1";
            // display questions on view
            panel.webview.postMessage({
                type: 'displayQuestions',
                questions: generatedQuestions
            });
        }
        if (message.type === 'save') {
            // save generated questions to quiz file
            // refer to addQuizQuestion.ts for saving quiz questions
        }
    });
});