/************************************************************************************
 * 
 * systemHelpers.ts
 * 
 * Helpers for system tests
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import {Workbench, Notification, NotificationType} from 'vscode-extension-tester';
import {expect} from 'chai';

export async function waitForNotification(type: NotificationType, matcher: (str: string) => boolean, timeout = 4000) {
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