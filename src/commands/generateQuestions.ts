
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

import { state, config, context } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';
import { getLLMProvider } from '../llm/llmConfig';

import type { PersonalizedQuestionsData } from '../types';

//may be deprecated with prompt engineering
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

// may be deprecated with prompt engineering
function parseLLMOutput(output: string): PersonalizedQuestionsData[] {
    // placeholder function to parse LLM output into array of questions
    // implement parsing logic based on expected output format
    
    // look for "Question: " delimiters to split questions
    // const questionBlocks = output.split('Question: ').slice(1); // first split is before first question
    // const questions: string[] = [];
    
    // for (const block of questionBlocks) {
    //     const questionText = block.split('Code Context Snippet: ')[0].trim();
    //     const codeSnippet = block.split('Code Context Snippet: ')[1]?.split('Answer: ')[0].trim() || '';
    //     const answerText = block.split('Answer: ')[1]?.trim() || '';

    //     const fullcodeTemp = '';
    //     const range = locateSnippetInCode(codeSnippet, fullcodeTemp); // need full code here
    //     //NOT DONE, STOPPING HERE
    // }
    //let formattedQuestion: PersonalizedQuestionsData;
    // file path needs to be determined from main func

    // cut off everything before first { and after last }
    const firstCurly = output.indexOf('{');
    const lastCurly = output.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        const jsonString = output.slice(firstCurly, lastCurly + 1);
        try {
            const parsed = JSON.parse(jsonString);
            return parsed.questions as PersonalizedQuestionsData[];
        } catch (error) {
            console.error('Error parsing LLM output as JSON:', error);
            return [];
        }
    }

    return [];
}

// use one LLM call to generate multiple questions
// vvv figure out output format/type
//async function generateAllInOne(code: string, userPrompt: string, numQuestions: number): Promise<string[]> {
async function generateAllInOne(code: string, userSpecifications: string, numQuestions: number, relativePath: string): Promise<PersonalizedQuestionsData[]> {
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

    //const finalUserPrompt = userPrompt + ` Please provide ${numQuestions} quiz questions. Contents: ${code}`;


    

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

        // Replace the code placeholder in the user prompt
        //const userPrompt = promptTemplate.user.replace('{{code}}', code).replace('{{fullCode}}', fullCode);
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
        const systemPrompt = promptTemplate.system.replace('{{questionTemplate}}', questionTemplate);
        
        // only give file name instead path
        const fileName = path.basename(relativePath);
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
        
        // sample response for testing
        // const response = {
        //     content: `[{"filePath": "${relativePath}", "text": "What is a data structure used to implement a stack?", "range": {"start": {"line": 10, "character": 5}, "end": {"line": 12, "character": 20}}, "highlightedCode": "class Stack:\\n    def __init__(self):\\n        self.items = []", "excludeFromQuiz": false, "answer": "A list or array can be used to implement a stack."}, {"filePath": "${relativePath}", "text": "Explain the difference between a list and a tuple in Python.", "range": {"start": {"line": 20, "character": 1}, "end": {"line": 22, "character": 15}}, "highlightedCode": "my_list = [1, 2, 3]\\nmy_tuple = (1, 2, 3)", "excludeFromQuiz": false, "answer": "Lists are mutable while tuples are immutable."}]`
        // }

//         const response = {
//             content: JSON.stringify({
//   "questions": [
//     {
//       "filePath": "",
//       "text": "What data structure is used to store unread bytes between socket reads, and why is it necessary for processing text lines efficiently?",
//       "answer": "A bytes object (`self.leftover`) is used to store unread leftover bytes so the code can avoid rereading data from the socket and efficiently assemble complete text lines.",
//       "range": {
//         "start": {"line": 32, "character": 8},
//         "end": {"line": 32, "character": 28}
//       },
//       "highlightedCode": "self.leftover = b''",
//       "excludeFromQuiz": false
//     },
//     {
//       "filePath": "",
//       "text": "How does the `receive_text_line` method use the leftover buffer to minimize unnecessary socket reads?",
//       "answer": "It first checks if `CR_LF` is already in `self.leftover`; if so, it uses the leftover data without performing a new `recv` call.",
//       "range": {
//         "start": {"line": 48, "character": 8},
//         "end": {"line": 52, "character": 30}
//       },
//       "highlightedCode": "if CR_LF in self.leftover:\n    chunk = self.leftover\nelse:\n    received = self.socket.recv(BLOCK_SIZE)",
//       "excludeFromQuiz": false
//     },
//     {
//       "filePath": "",
//       "text": "When transferring binary data, what role does the variable `bytes_received` play, and why is it important for loop control?",
//       "answer": "`bytes_received` tracks how many bytes have been written so far. It ensures the loop continues receiving and writing until the content_length is satisfied or the socket closes.",
//       "range": {
//         "start": {"line": 96, "character": 12},
//         "end": {"line": 110, "character": 40}
//       },
//       "highlightedCode": "bytes_received = len(self.leftover)\n...\nwhile bytes_received < content_length:",
//       "excludeFromQuiz": false
//     },
//     {
//       "filePath": "",
//       "text": "In the method `send_binary_data_from_file`, what data structure is used to store chunks of data read from the file before sending them over the socket?",
//       "answer": "A bytes object (`chunk`) is used to store each block of binary data read from the file before being sent using `sendall`.",
//       "range": {
//         "start": {"line": 114, "character": 12},
//         "end": {"line": 121, "character": 30}
//       },
//       "highlightedCode": "chunk = source.read(min(content_length, BLOCK_SIZE))",
//       "excludeFromQuiz": false
//     },
//     {
//       "filePath": "",
//       "text": "Why is a `bytes` constant (`CR_LF = b'\\r\\n'`) used instead of a string when processing incoming text lines?",
//       "answer": "Because socket data is received as raw bytes, using a bytes constant allows efficient detection and splitting of line endings without converting between types.",
//       "range": {
//         "start": {"line": 14, "character": 0},
//         "end": {"line": 14, "character": 20}
//       },
//       "highlightedCode": "CR_LF = b'\\r\\n'",
//       "excludeFromQuiz": false
//     }
//   ]
// }
// )
//         }

        console.log('LLM Response:', response.content);


        //return response.content;
        // perform checks on output here, if it is expected, return it
        // expected to be json array of questions
        const output = response.content;

        // try to parse output as json
        //const parsedOutput = JSON.parse(output);
        const parsedOutput = parseLLMOutput(output);
        console.log('Parsed LLM Output:', parsedOutput);
        console.log('Value:', parsedOutput);
        // check if parsedOutput is array of questions
        if (Array.isArray(parsedOutput)) {
            // further checks can be added here
            if (parsedOutput.length === 0) {
                throw new Error('LLM output contains an empty array of questions.');
            }
            // assign filePath for each question
            for (const question of parsedOutput) {
                question.filePath = relativePath;
            }
            // should be fine, it will error if incorrect, and we can catch it
            return parsedOutput as PersonalizedQuestionsData[];
        } else {
            throw new Error('LLM output is not an array of questions.');
        }
    } catch (error) {
        console.error('Error generating question from code:', error);
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
            // vvv assign to our state questions var
            //generateAllInOne(studentCode, message.userPrompt, message.numQuestions, relativePath);
            //const generatedQuestions = "test q1";
            
            console.log("generate message received:", message);
            generatedQuestions = await generateAllInOne(studentCode, message.userPrompt, message.numQuestions, relativePath);
            
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
            if (!generatedQuestions) {
                vscode.window.showErrorMessage('No questions were generated.');
                return;
            }
            const convertedQuestions = generatedQuestions.map((q, index) => {
                return `<h3>Question ${index + 1}:</h3><p>${q.text}</p><h3>Code Snippet:</h3><pre><code>${q.highlightedCode}</code></pre><h3>Answer:</h3><p>${q.answer}</p><h3>Location:</h3><p>${q.filePath} [Lines ${q.range.start.line}-${q.range.end.line}, Start col: ${q.range.start.character}, End col: ${q.range.end.character}]</p><h3>File Path:</h3><p>${q.filePath}</p><br /><br />`;
            }).join('\n');



            // display questions on view
            panel.webview.postMessage({
                type: 'displayQuestions',
                questions: convertedQuestions
            });
        }
        if (message.type === 'save') {
            // save generated questions to quiz file
            // refer to addQuizQuestion.ts for saving quiz questions
            console.log('Personalized Questions Data: ', state.personalizedQuestionsData);
            if (!generatedQuestions) {
                vscode.window.showErrorMessage('No generated questions to save.');
            } else if (generatedQuestions.length > 0) {
                for (const questionData of generatedQuestions) {
                    console.log('Saving Question Data: ', questionData);
                    state.personalizedQuestionsData.push(questionData);
                }
                // save after all questions are added to state
                await Util.saveDataToFile(quizQuestionsFileName, state.personalizedQuestionsData);
            }
        }
    });
});