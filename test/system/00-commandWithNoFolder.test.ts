// IMPORTANT:  The 00 prefix is to ensure that this test (which relies on no workspace being open)
// runs first. 

import {Workbench, NotificationType, WebDriver, VSBrowser } from 'vscode-extension-tester';
import { logAllNotifications, waitForNotification } from '../helpers/systemHelpers';
import { logFileName } from '../../src/fileLogger';

describe('Behavior with no folder open', function() {
	let driver: WebDriver;
	let workbench: Workbench;

	this.timeout(120_000);

	before(async () => {
		// Get the VS Code browser driver
		driver = VSBrowser.instance.driver;
		workbench = new Workbench();

		// Wait for the extension to be ready if needed
		await workbench.wait();
	});

	it('should display modal error message when first command run', async function () {
		console.log(`The log file: ${logFileName}`);
		await workbench.executeCommand('gvQLC: View Quiz Questions');
		console.log(Date.now());
		await new Promise(resolve => setTimeout(resolve, 5_000));
		console.log(Date.now());
		logAllNotifications();

		await waitForNotification(NotificationType.Error, (message: string) => {
			return message.indexOf('gvQLC requires a workspace folder to be open. (modal)') >= 0;
		}, 7_000);
	});

	it('should display non-modal error message when second command run', async function () {
		await workbench.executeCommand('gvQLC: View Quiz Questions');

		await waitForNotification(NotificationType.Error, (message: string) => {
			return message.indexOf('gvQLC requires a workspace folder to be open.') >= 0 && message.indexOf('(modal)') < 0;
		});
	});
});