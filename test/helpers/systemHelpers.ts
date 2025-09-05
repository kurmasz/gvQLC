/************************************************************************************
 *
 * systemHelpers.ts
 *
 * Helpers for system tests
 *
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import {
  Workbench,
  Notification,
  NotificationType,
  WebDriver,
  VSBrowser,
  TextEditor,
} from "vscode-extension-tester";
import { By, until, WebElement, Key } from "selenium-webdriver";
import { expect } from "chai";
import * as path from "path";
import * as fs from "fs-extra";

export async function pause(time: number) {
  await new Promise((res) => setTimeout(res, time));
}

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
  return await openWorkspaceFromPath(
    driver,
    path.resolve(path.join("test-fixtures", folder))
  );
}

export async function openTempWorkspace(driver: WebDriver, folder: string) {
  const sourceDir = path.resolve(path.join("test-fixtures", folder));
  const tempWorkspaceDir = await fs.mkdtemp(
    path.resolve(path.join("test-fixtures-tmp", folder + "-"))
  );
  console.log("----------------------");
  console.log(sourceDir);
  console.log(tempWorkspaceDir);

  await fs.copy(sourceDir, tempWorkspaceDir);
  const workbench = await openWorkspaceFromPath(driver, tempWorkspaceDir);
  return { workbench, tempWorkspaceDir };
}

export async function waitForNotification(
  type: NotificationType,
  matcher: (str: string) => boolean,
  timeout = 4000
) {
  let center = await new Workbench().openNotificationsCenter();
  const start = Date.now();
  let notifications: Notification[] = [];
  let messages: string[] = [];
  while (Date.now() - start < timeout) {
    notifications = await center.getNotifications(type);
    messages = await Promise.all(
      notifications.map(async (n) => n.getMessage())
    );
    // console.log(`Elapsed ${Date.now() - start}`);
    // console.log(messages);
    const matches = messages.filter(matcher);
    expect(matches.length).to.be.at.most(1);
    if (matches.length === 1) {
      return matches[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    center = await new Workbench().openNotificationsCenter();
  } // end while

  console.log("About to give up");
  await logAllNotifications();
  console.log("-----");

  if (notifications.length > 0) {
    await center.clearAllNotifications();
  }
  if (notifications.length === 0) {
    expect.fail("No notifications appeared.");
  } else {
    expect.fail(`None of the notifications matched: ${messages.join(", ")}`);
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
    const messages = await Promise.all(
      notifications.map(async (n) => n.getMessage())
    );
    console.log(notificationType);
    console.log(messages);
  }
}

export async function assertNumNotifications(expectedNum: number) {
  const center = await new Workbench().openNotificationsCenter();
  const allTypes = [
    NotificationType.Error,
    NotificationType.Warning,
    NotificationType.Info,
  ];
  let observedNotificationTotal = 0;
  for (const notificationType of allTypes) {
    const notifications = await center.getNotifications(notificationType);
    observedNotificationTotal += notifications.length;
  }
  if (observedNotificationTotal !== expectedNum) {
    console.log(
      `loggin all notifications because ${observedNotificationTotal} !== ${expectedNum}`
    );
    await logAllNotifications();
  }
  expect(observedNotificationTotal).to.equal(expectedNum);
}

export async function dismissAllNotifications() {
  const center = await new Workbench().openNotificationsCenter();
  await center.clearAllNotifications(); // clears everything
  await center.close();
}

export async function openFile(filePath: string) {
  const timeoutMs = 10000;
  const quickOpen = await new Workbench().openCommandPrompt();
  await quickOpen.setText(filePath);

  let start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const qp = await quickOpen.getQuickPicks();
    if (qp.length > 0) {
      break;
    }
    console.log("Delay waiting for quick picks", Date.now() - start);
    await new Promise((r) => setTimeout(r, 50));
  }
  await quickOpen.confirm();

  start = Date.now();
  const editor = new TextEditor();
  while (Date.now() - start < timeoutMs) {
    try {
      // Attempt a minimal interaction that requires the editor to be ready
      await editor.selectText(""); // selecting empty string
      return editor;
    } catch {
      // editor not ready yet
      console.log("Delay waiting for editor to be ready", Date.now() - start);
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw new Error("Timeout waiting for editor to become interactable");
}
