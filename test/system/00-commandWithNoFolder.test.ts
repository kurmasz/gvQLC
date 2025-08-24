// IMPORTANT:  The 00 prefix is to ensure that this test (which relies on no workspace being open)
// runs first. 
/************************************************************************************
 * 
 * 00-commandWithNoFolder.test.ts
 * 
 * Test behavior with no folder open
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import { Workbench, NotificationType, WebDriver, VSBrowser } from 'vscode-extension-tester';
import { logAllNotifications, waitForNotification } from '../helpers/systemHelpers';
import { logFileName } from '../../src/fileLogger';

describe('Behavior with no folder open', function () {
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

	after(async function () {
		await driver.switchTo().defaultContent();
	});

	//
	// "View Quiz Questions"
	//
	it('should display modal error message when "View Quiz Questoins" command run', async function () {
		console.log(`The log file: ${logFileName}`);
		await workbench.executeCommand('gvQLC: View Quiz Questions');
		await new Promise(resolve => setTimeout(resolve, 5_000));
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

	// "Add Quiz Question"
	it('should display non-modal error message when "Add Quiz Question" command run', async function () {
		// Error should be non-modal because the call to View Quiz Questions above should have triggered the 
		// one and only modal error. 
		await workbench.executeCommand('gvQLC: Add Quiz Question');
		await waitForNotification(NotificationType.Error, (message: string) => {
			return message.indexOf('gvQLC requires a workspace folder to be open.') >= 0 && message.indexOf('(modal)') < 0;
		});
	});
});