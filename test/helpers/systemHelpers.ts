/************************************************************************************
 * 
 * systemHelpers.ts
 * 
 * Helpers for system tests
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/


import { Workbench, Notification, NotificationType, WebDriver, VSBrowser } from 'vscode-extension-tester';
import { By, until, WebElement, Key } from 'selenium-webdriver';
import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs-extra';

async function openWorkspaceFromPath(driver: WebDriver, folder: string) {
  let basename = path.basename(folder);
    await VSBrowser.instance.openResources(folder, async () => {
        const selector = By.css(`[aria-label="Explorer Section: ${basename}"]`);
        const element = await driver.wait(until.elementLocated(selector), 10_000);
        await driver.wait(until.elementIsVisible(element), 5_000);
    });

    const workbench = new Workbench();
    await workbench.wait();
    return workbench;
}

export async function openWorkspace(driver: WebDriver, folder: string) {
    return await openWorkspaceFromPath(driver, path.join('test-fixtures', folder));
}

export async function openTempWorkspace(driver: WebDriver, folder: string) {
    const sourceDir = path.resolve(path.join('test-fixtures', folder));
    const tempWorkspaceDir = await fs.mkdtemp(path.resolve(path.join('test-fixtures-tmp', folder + '-')));
    console.log("----------------------");
    console.log(sourceDir);
    console.log(tempWorkspaceDir);


    await fs.copy(sourceDir, tempWorkspaceDir);
    const workbench = await openWorkspaceFromPath(driver, tempWorkspaceDir);
    return {workbench, tempWorkspaceDir};
}


export async function waitForNotification(type: NotificationType, matcher: (str: string) => boolean, timeout = 4000) {
    let center = await new Workbench().openNotificationsCenter();
    const start = Date.now();
    let notifications: Notification[] = [];
    let messages: string[] = [];
    while (Date.now() - start < timeout) {
        notifications = await center.getNotifications(type);
        messages = await Promise.all(notifications.map(async (n) => n.getMessage()));
        // console.log(`Elapsed ${Date.now() - start}`);
        // console.log(messages);
        const matches = messages.filter(matcher);
        expect(matches.length).to.be.at.most(1);
        if (matches.length === 1) {
            return matches[0];
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        center = await new Workbench().openNotificationsCenter();
    } // end while

    console.log("About to give up");
    await logAllNotifications();
    console.log("-----");

    if (notifications.length > 0) {
        await center.clearAllNotifications();
    }
    if (notifications.length === 0) {
        expect.fail('No notifications appeared.');
    } else {
        expect.fail(`None of the notifications matched: ${messages.join(', ')}`);
    }
}

export async function logAllNotifications() {
    const center = await new Workbench().openNotificationsCenter();
    const allTypes = [
        NotificationType.Error,
        NotificationType.Warning,
        NotificationType.Info,
    ];
    for (const notificationType of allTypes) {
        const notifications = await center.getNotifications(notificationType);
        const messages = await Promise.all(notifications.map(async (n) => n.getMessage()));
        console.log(notificationType);
        console.log(messages);
    }
}

export async function openFile(filePath: string) {
    const quickOpen = await (new Workbench).openCommandPrompt();
    await quickOpen.setText(filePath);
    // TODO: Set up with a time limit.
    while(true) {
        const qp = await quickOpen.getQuickPicks();
        if (qp.length > 0) {
            break;
        }
    }
    await quickOpen.confirm();
}

