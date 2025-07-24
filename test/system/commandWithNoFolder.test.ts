import { Notification, Workbench, NotificationType, InputBox, WebDriver, VSBrowser } from 'vscode-extension-tester';
import { expect } from 'chai';
import { time } from 'console';

describe('Behavior with no folder open', () => {
	let driver: WebDriver;
	let workbench: Workbench;

	before(async () => {
		// Get the VS Code browser driver
		driver = VSBrowser.instance.driver;
		workbench = new Workbench();

		// Wait for the extension to be ready if needed
		await workbench.wait();
	});

	it('should display modal error message when first command run', async function () {
		await workbench.executeCommand('gvQLC: View Quiz Questions');

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


async function waitForNotification(type: NotificationType, matcher: (str: string) => boolean, timeout = 4000) {
	const center = await new Workbench().openNotificationsCenter();
	const start = Date.now();
	let notifications: Notification[] = [];
	let messages: string[] = [];
	while (Date.now() - start < timeout) {
		notifications = await center.getNotifications(type);
		messages = await Promise.all(notifications.map(async (n) => n.getMessage()));
		console.log(messages);
		const matches = messages.filter(matcher);
		expect(matches.length).to.be.at.most(1);
		if (matches.length === 1) {
			return matches[0];
		}
		await new Promise(resolve => setTimeout(resolve, 500));
	} // end while

	await center.clearAllNotifications();
	if (notifications.length === 0) {
		expect.fail('No notifications appeared.');
	} else {
		expect.fail(`None of the notifications matched: ${messages.join(', ')}`);
	}
}