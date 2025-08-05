// IMPORTANT:  The 00 prefix is to ensure that this test (which relies on no workspace being open)
// runs first. 

import {Workbench, NotificationType, WebDriver, VSBrowser } from 'vscode-extension-tester';
import { logAllNotifications, waitForNotification } from '../helpers/systemHelpers';

describe('Behavior with no folder open', () => {
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
		await workbench.executeCommand('gvQLC: View Quiz Questions');
		logAllNotifications();

		await waitForNotification(NotificationType.Error, (message: string) => {
			return message.indexOf('gvQLC requires a workspace folder to be open. (modal)') >= 0;
		});
	});

	it('should display non-modal error message when second command run', async function () {
		await workbench.executeCommand('gvQLC: View Quiz Questions');

		await waitForNotification(NotificationType.Error, (message: string) => {
			return message.indexOf('gvQLC requires a workspace folder to be open.') >= 0 && message.indexOf('(modal)') < 0;
		});
	});
});