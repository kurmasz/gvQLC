import { Notification, Workbench, NotificationType, InputBox, WebDriver, VSBrowser } from 'vscode-extension-tester';
import { expect } from 'chai';
import { time } from 'console';

describe('Basic E2E Test', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async () => {
        // Get the VS Code browser driver
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        // Wait for the extension to be ready if needed
        await workbench.wait();
    });

	it('should display message if command run with no folder open', async function() {
		this.timeout(10000);
		await workbench.executeCommand('gvQLC: View Quiz Questions');

		await waitForNotification(NotificationType.Error, (message: string) => {
			return message.indexOf('gvQLC requires a workspace folder to be open.') >= 0;
		});

		// this time we can clear all notifications
		//await (await workbench.openNotificationsCenter()).clearAllNotifications(); 
	});


    it.skip('should activate the extension and run a command', async () => {
        // Open command palette
        console.log("Hello!");
        await workbench.executeCommand('gvQLC: Hello World');
        console.log("Here 2");

		/* 
		(await VSBrowser.instance.driver.wait(async () => {
			return notificationExists('Hello World from gvQLC!');
		}, 2517)) as Notification;
		*/
        console.log("Here 3");

       const center = await new Workbench().openNotificationsCenter();
        console.log("Here 4");

		// get notifications from the notifications center
		// this time they can be filtered by type
		// lets get info notifications only
		const notifications = await center.getNotifications(NotificationType.Info);
		console.log('Notifications: ', notifications.length);

		// once again we can look for the hello notification
		let notification!: Notification;
		for (const not of notifications) {
			const message = await not.getMessage();
			if (message.includes('Hello')) {
				notification = not;
			}
		}

		expect(await notification.getText()).equals('Hello World from gvQLC!');
		expect(await notification.getType()).equals(NotificationType.Info);

		// this time we can clear all notifications
		//await center.clearAllNotifications(); 

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
		const matches = messages.filter(matcher);
		expect(matches.length).to.be.at.most(1);
		if (matches.length === 1) {
			return matches[0];
		}
		await new Promise(resolve => setTimeout(resolve, 500));
	} // end while

	if (notifications.length === 0) {
		expect.fail('No notifications appeared.');
	} else {
		expect.fail(`None of the notifications matched: ${messages.join(', ')}`);
	}
}