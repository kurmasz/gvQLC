// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { setContext } from './gvQLC';

import { viewQuizQuestionsCommand } from './commands/viewQuizQuestions';
import { addQuizQuestionCommand } from './commands/addQuizQuestion';
import { setLLMApiKeyCommand } from './commands/setLLMApiKey';
import { exportQuizCommand } from './commands/exportQuiz';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gvqlc" is now active!');
	setContext(context);

	/* 
	Object.entries(process.env).forEach(([key, value]) => {
  		console.log(`QQQ ${key}: ${value}`);
	});
	*/

	context.subscriptions.push(
		viewQuizQuestionsCommand,
		addQuizQuestionCommand,
		setLLMApiKeyCommand,
		exportQuizCommand
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
