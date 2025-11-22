
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

import { state, config, context } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';
import { getLLMProvider } from '../llm/llmConfig';

import type { PersonalizedQuestionsData } from '../types';

//deprecated with prompt engineering
// Known issue: also counts \n in quote strings when calculating line numbers, so may be off in those cases
//              need more robust parsing to avoid that, but it is too time expensive to implement right now
function locateSnippetInCode(snippet: string, fullCode: string): { startLine: number, startCol: number, endLine: number, endCol: number }{
    // placeholder function to locate snippet in full code
    // implement logic to find line and column numbers

    const snippetIndex = fullCode.indexOf(snippet);
    if (snippetIndex !== -1) {
        const beforeSnippet = fullCode.slice(0, snippetIndex);
        const snippetLines = snippet.split('\n');
        
        const startLine = beforeSnippet.split('\n').length; // does not account for \n in quote strings, perhaps check that it is not in quotes?
        const startCol = beforeSnippet.split('\n').pop()!.length + 1;
        const endLine = startLine + snippetLines.length - 1;
        const endCol = snippetLines.length === 1 ? startCol + snippet.length : snippetLines[snippetLines.length - 1].length + 1;

        return { startLine, startCol, endLine, endCol };
    }

    // need new logic to handle not found case
    return { startLine: 0, startCol: 0, endLine: 0, endCol: 0 };
}

// some LLMs may output extra text before/after the json array of questions
// need to parse that out
function parseLLMOutput(output: string): PersonalizedQuestionsData[] {
    // cut off everything before first { and after last }
    const firstCurly = output.indexOf('{');
    const lastCurly = output.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        // slice out the json string
        const jsonString = output.slice(firstCurly, lastCurly + 1);
        try {
            const parsed = JSON.parse(jsonString);
            // check if correct format
            if (!parsed.questions || !Array.isArray(parsed.questions)) {
                throw new Error('Parsed JSON does not contain a valid questions array.');
            }
            if (parsed.questions.length === 0) {
                throw new Error('Parsed questions array is empty.');
            }
            // validate format of each question
            for (const question of parsed.questions) {
                try {
                    if (typeof question.text !== 'string' 
                        || typeof question.highlightedCode !== 'string' 
                        || typeof question.filePath !== 'string' 
                        || typeof question.excludeFromQuiz !== 'boolean' 
                        || typeof question.answer !== 'string' 
                        || typeof question.range !== 'object' 
                        || typeof question.range.start !== 'object' 
                        || typeof question.range.end !== 'object' 
                        || typeof question.range.start.line !== 'number' 
                        || typeof question.range.start.character !== 'number' 
                        || typeof question.range.end.line !== 'number' 
                        || typeof question.range.end.character !== 'number') {
                        throw new Error('One or more questions are not in the expected format.');
                    }
                } catch (error) {
                    console.error('Error validating question format:', error);
                    throw new Error('One or more questions are not in the expected format.');
                }

            }
            // all checks passed
            return parsed.questions as PersonalizedQuestionsData[];
        } catch (error) {
            console.error('Error parsing LLM output as JSON:', error);
            throw new Error('Failed to parse LLM output as JSON.');
            //return [];
        }
    }
    // should this throw error instead?
    //return [];
    throw new Error('LLM output does not contain valid JSON.');
}

// use one LLM call to generate multiple questions
async function generateAllInOne(code: string, userSpecifications: string, numQuestions: number, relativePath: string): Promise<PersonalizedQuestionsData[]> {
    try {
        // Load the prompt template from the extension's directory
        // In development: extensionPath/src/llm/prompts/autoGenerateQuestions.json
        // In production: extensionPath/out/src/llm/prompts/autoGenerateQuestions.json
        const ctx = context();
        let promptPath = path.join(ctx.extensionPath, 'out', 'src', 'llm', 'prompts', 'autoGenerateQuestions.json');
        
        // Fallback to src/ for development/debugging
        try {
            await fs.access(promptPath);
        } catch {
            promptPath = path.join(ctx.extensionPath, 'src', 'llm', 'prompts', 'autoGenerateQuestions.json');
        }
        
        const promptContent = await fs.readFile(promptPath, 'utf-8');
        const promptTemplate = JSON.parse(promptContent);

        // prompt engineering tool to show expected question format
        // should match PersonalizedQuestionsData type, but Gemini ignores optional answer field every time
        const questionTemplate = `{
    answer: string,
    filePath: string,
    text: string,
    range: {
        start: {line: number, character: number},
        end: {line: number, character: number}
    },
    highlightedCode: string,
    excludeFromQuiz: boolean
}`;
        // Inject question template into system prompt
        const systemPrompt = promptTemplate.system.replace('{{questionTemplate}}', questionTemplate);
        
        // only give file name instead path
        const fileName = path.basename(relativePath);

        // Inject dynamic values into user prompt
        const userPrompt = promptTemplate.user.replace('{{userSpecifications}}', userSpecifications).replace('{{numQuestions}}', numQuestions.toString()).replace('{{fileName}}', fileName).replace('{{studentCode}}', code);

        console.log('before LLM call prompts:');
        
        // Get the appropriate LLM provider based on configuration
        const provider = await getLLMProvider(context());

        console.log('LLM provider obtained.');
        console.log('llm provider:', provider);

        // Generate the completion
        const response = await provider.generateCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);

        console.log('after LLM call response received.');
        console.log('System Prompt:', systemPrompt);
        console.log('User Prompt:', userPrompt);
        console.log('LLM Response:', response.content);


        //return response.content;
        // perform checks on output here, if it is expected, return it
        // expected to be json array of questions
        const output = response.content;

        // try to parse output as json
        //const parsedOutput = JSON.parse(output);

        // this should be in the correct format if it did not throw error
        // if it did throw error, it will be caught in catch block below
        const parsedOutput = parseLLMOutput(output);

        console.log('Parsed LLM Output:', parsedOutput);
        console.log('Value:', parsedOutput);

        // check if parsedOutput is array of questions
        // unnecessary due to parseLLMOutput checks
        // if (Array.isArray(parsedOutput)) {
        //     // further checks can be added here
        //     if (parsedOutput.length === 0) {
        //         throw new Error('LLM output contains an empty array of questions.');
        //     }

        // } else {
        //     throw new Error('LLM output is not an array of questions.');
        // }

        // assign filePath for each question
        for (const question of parsedOutput) {
            question.filePath = relativePath;
        }
        // should be fine, it will throw an error if incorrect, and we can catch it
        return parsedOutput as PersonalizedQuestionsData[];

    } catch (error) {
        console.error('Error generating question from code:', error);
        //vscode.window.showErrorMessage(`Error generating question: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error(`Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

    // Get workspace root and calculate relative path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const absolutePath = editor.document.uri.fsPath;
    const relativePath = path.relative(workspaceRoot, absolutePath);

    const panel = vscode.window.createWebviewPanel(
        'generateQuestions',
        'Generate Quiz Questions',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );
    
    // may not need this passed in
    // vvv figure out how to store this
    let generatedQuestions = null as PersonalizedQuestionsData[] | null;
    const htmlData = {
        //questions: generatedQuestions
        questions: '',
    };
    panel.webview.html = Util.renderMustache('generateQuestions.mustache.html', htmlData);

    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'generate') {
            //generatedQuestions = [{ filePath: relativePath, text: "test", range: { start: { line: 1, character: 1 }, end: { line: 1, character: 10 } }, highlightedCode: "this is a code snippet", excludeFromQuiz: false, answer: "test answer" }, { filePath: relativePath, text: "test2", range: { start: { line: 2, character: 1 }, end: { line: 2, character: 10 } }, highlightedCode: "this is another code snippet", excludeFromQuiz: false, answer: "test answer 2" }];
            
            // convert to displayable format
            
            //const convertedQuestions = JSON.stringify(generatedQuestions, null, 2);
            //const questions
            // converted questions only need to display text, code snippet, answer, and lines/start col end col in innerHTML
            // const convertedQuestions = generatedQuestions.map((q, index) => {
                //     return {
                    //         number: index + 1,
                    //         text: q.text,
                    //         highlightedCode: q.highlightedCode,
                    //         answer: q.answer,
                    //         filePath: q.filePath,
                    //         range: q.range
                    //     };
                    // });
                    

            // var in command scope, only assigned if it matches expected format
            // so if not null, it is safe to use
            // null means something went wrong during generation, or improper format
            try {
                generatedQuestions = await generateAllInOne(studentCode, message.userPrompt, message.numQuestions, relativePath);
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
                generatedQuestions = null;
                // return leaves the anonymous function, not the outer command
                return;
            }

            // never should be null here, but check anyway
            if (!generatedQuestions) {
                vscode.window.showErrorMessage('No questions were generated.');
            } else if (generatedQuestions.length > 0 ) {
                // convert to displayable HTML format
                const convertedQuestions = generatedQuestions.map((q, index) => {
                    return `<h3>Question ${index + 1}:</h3><p>${q.text}</p><h3>Code Snippet:</h3><pre><code>${q.highlightedCode}</code></pre><h3>Answer:</h3><p>${q.answer}</p><h3>Location:</h3><p>${q.filePath} [Lines ${q.range.start.line}-${q.range.end.line}, Start col: ${q.range.start.character}, End col: ${q.range.end.character}]</p><h3>File Path:</h3><p>${q.filePath}</p><br /><br />`;
                }).join('\n');
    
                // display questions on view
                panel.webview.postMessage({
                    type: 'displayQuestions',
                    questions: convertedQuestions
                });
            }
        }

        if (message.type === 'save') {
            // save generated questions to quiz file
            // refer to addQuizQuestion.ts for saving quiz questions
            if (!generatedQuestions) {
                vscode.window.showErrorMessage('No generated questions to save.');
            } else if (generatedQuestions.length > 0) {
                for (const questionData of generatedQuestions) {
                    console.log('Saving Question Data: ', questionData);
                    state.personalizedQuestionsData.push(questionData);
                }
                // save to file after all questions are added to state
                try {
                    await Util.saveDataToFile(quizQuestionsFileName, state.personalizedQuestionsData);
                    vscode.window.showInformationMessage('Generated questions saved to quiz file successfully.');
                } catch (error) {
                    vscode.window.showErrorMessage(`Error saving questions to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }
    });
});