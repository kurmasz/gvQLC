
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

import { state, config, context } from '../gvQLC';
import { quizQuestionsFileName } from '../sharedConstants';

import * as Util from '../utilities';
import { getLLMProvider } from '../llm/llmConfig';

import type { PersonalizedQuestionsData } from '../types';

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
//async function generateAllInOne(code: string, userPrompt: string, numQuestions: number): Promise<string[]> {
async function generateAllInOne(code: string, userPrompt: string, numQuestions: number): Promise<PersonalizedQuestionsData[]> {
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

    const finalUserPrompt = userPrompt + ` Please provide ${numQuestions} quiz questions. Contents: ${code}`;
    //const 


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
            //const generatedQuestions = "test q1";
            
            //const generatedQuestions = await generateAllInOne(studentCode, message.userPrompt, message.numQuestions);
            const generatedQuestions = [{ filePath: vscode.window.activeTextEditor?.document.uri.fsPath || '', text: "test", range: { start: { line: 1, character: 1 }, end: { line: 1, character: 10 } }, highlightedCode: "this is a code snippet", excludeFromQuiz: false, answer: "test answer" }, { filePath: vscode.window.activeTextEditor?.document.uri.fsPath || '', text: "test2", range: { start: { line: 2, character: 1 }, end: { line: 2, character: 10 } }, highlightedCode: "this is another code snippet", excludeFromQuiz: false, answer: "test answer 2" }];
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
            const convertedQuestions = generatedQuestions.map((q, index) => {
                return `<h3>Question ${index + 1}:</h3><p>${q.text}</p><h3>Code Snippet:</h3><pre><code>${q.highlightedCode}</code></pre><h3>Answer:</h3><p>${q.answer}</p><h3>Location:</h3><p>${q.filePath} [Lines ${q.range.start.line}-${q.range.end.line}, Start col: ${q.range.start.character}, End col: ${q.range.end.character}]</p><br /><br />`;
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
            console.log(locateSnippetInCode(`def close(self):
        self.socket.close()`, `"""
http_socket.py

This class opens a socket, then provides a means to perform both text and binary operations.
In particular, it supports reading the text responses and headers from an HTTP server, followed
by reading a binary payload. (In general, one must be careful when switching between text and 
binary operations to ensure that any buffered data are not lost.)

The main goal for this code is simplicity. It is, by no means, the most efficient implementation.

GVSU CIS 371 2025

Name: Mateo Vrooman
"""

import socket
import ssl
import sys

BLOCK_SIZE = 1024
CR_LF = b'\r\n'

class HTTPSocket: 

    def __init__(self, skt,  verbose=False):
        self.socket = skt
        self.leftover = b''
        self.verbose = verbose 

    @classmethod
    def connect(cls, hostname, port, secure=True, verbose=False):
        """
        Open a socket connection to the specified host and port.
        * secure: Use SSL
        * verbose: display send and received messages on stderr. 
        """ 
        raw_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)  
        print("Connecting to", hostname, port)      
        
        if secure:
            context = ssl.create_default_context()  # Create a default SSL context
            skt = context.wrap_socket(raw_socket, server_hostname=hostname)
        else:
            skt = raw_socket
        skt.connect((hostname, port))
        return cls(skt, verbose=verbose)

    def receive_text_line(self):
        """
        Receive one line of text from the sender.

        Conceptually, this method pulls one byte at a time from the socket until it 
        encounters a newline, then returns the line of text.

        However, reading one byte at a time would be very inefficient. So, instead, 
        this method reads a chunk of BLOCK_SIZE bytes. If the line of text is shorter than 
        BLOCK_SIZE, it saves the leftovers and uses those bytes before reading more bytes 
        from the socket. 
        """

        # Check and see if the leftover bytes contain a full line of text.
        # if not, read more bytes and combine them with the leftovers 
        # (if any)
        if CR_LF in self.leftover:
            chunk = self.leftover
        else:
            received = self.socket.recv(BLOCK_SIZE)    
        
            if not received: # Handle the case where the socket closes before a full line is received.
                return None
            
            chunk = self.leftover + received
            print("chunk", chunk)


        # Split the bytes at the first CR/LF combination.
        # The first part is decoded and returned as text.
        # The second part is the "leftover" bytes and is 
        # saved for the read operation
        if CR_LF not in chunk: # Incomplete data
            self.leftover = chunk
            return None

        line, self.leftover = chunk.split(CR_LF, 1)
        return line.decode()

    def send_text_line(self, message):
        """
        Send one line of text followed by CR_LF
        """
        if (self.verbose):
            sys.stderr.write(f"Sending =>{message}<=\n")
            sys.stderr.flush()
        self.socket.sendall(message.encode('utf-8') + CR_LF)


    def transfer_incoming_binary_data(self, target, content_length):
        """
        Transfer content_length bytes from the socket to the target stream.
        (Or simply transfer any remaining bytes if the socket closes before
        reaching content_length)
        """

        # If we have enough leftover bytes, simply use them.
        if content_length < len(self.leftover):
            data = self.leftover[:content_length]
            self.leftover = self.leftover[content_length:]
            target.write(data)
        else: 
            # Begin by writing any leftover bytes.
            target.write(self.leftover)
            bytes_received = len(self.leftover)

            # receive and write chunks of BLOCK_SIZE bytes until content_length
            # bytes have been received.
            while bytes_received < content_length:  
                chunk = self.socket.recv(min(content_length - bytes_received, BLOCK_SIZE))
                target.write(chunk)
                bytes_received += len(chunk)

    def send_binary_data_from_file(self, source, content_length):
        """
        Send content_length bytes from the source file.
        """
        bytes_sent = 0
        while bytes_sent < content_length:
            chunk = source.read(min(content_length, BLOCK_SIZE))
            self.socket.sendall(chunk)
            bytes_sent += len(chunk) 

    def close(self):
        self.socket.close()


    def __del__(self):
        self.close()`));
        }
    });
});