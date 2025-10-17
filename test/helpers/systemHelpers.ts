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
import { By, until, error } from "selenium-webdriver";
import { expect } from "chai";
import * as path from "path";
import * as fs from "fs-extra";

export async function pause(time: number) {
  await new Promise((res) => setTimeout(res, time));
}

async function openWorkspaceFromPath(folder: string) {
  const driver = VSBrowser.instance.driver;
  let basename = path.basename(folder);

  await VSBrowser.instance.openResources(folder, async () => {
    const selector = By.css(`[aria-label="Explorer Section: ${basename}"]`);
    const element = await driver.wait(until.elementLocated(selector), 10_000);
    await driver.wait(until.elementIsVisible(element), 5_000);
  });

  await new Workbench().wait();
}

export function fixturePath(fixtureName: string) {
  return path.resolve(path.join("test-fixtures", fixtureName));
}

export async function openWorkspace(folder: string) {
  return await openWorkspaceFromPath(fixturePath(folder));
}

export async function makeTempCopy(folder: string) {
  const sourceDir = path.resolve(path.join("test-fixtures", folder));
  const tempWorkspaceDir = await fs.mkdtemp(
    path.resolve(path.join("test-fixtures-tmp", folder + "-"))
  );

  console.log(`copying ${sourceDir} to ${tempWorkspaceDir}`);
  

  await fs.copy(sourceDir, tempWorkspaceDir);
  return tempWorkspaceDir;
}

export async function openTempWorkspace(folder: string) {
  const tempWorkspaceDir = await makeTempCopy(folder);
  await openWorkspaceFromPath(tempWorkspaceDir);
  return tempWorkspaceDir;
}

export async function waitForNotification(
  type: NotificationType,
  matcher: (str: string) => boolean,
  timeout = 4000
): Promise<string> {
  let notifications: Notification[] = [];
  let messages: string[] = [];
  let matchedMessage: string | undefined;

  try {
    await VSBrowser.instance.driver.wait(async () => {
      const center = await new Workbench().openNotificationsCenter();
      notifications = await center.getNotifications(type);
      messages = await Promise.all(
        notifications.map(async (n) => n.getMessage())
      );
      const matches = messages.filter(matcher);
      expect(matches.length).to.be.at.most(1);
      if (matches.length === 1) {
        matchedMessage = matches[0];
        return true;
      }
      return false;
    }, timeout);
  } catch (err) {
    if (err instanceof error.TimeoutError) {
      console.log("Giving waiting for notification");
      await logAllNotifications();
      console.log("-----");

      //  I don't rememer why I thought we needed this.
      // if (notifications.length > 0) { await center.clearAllNotifications(); }

      if (notifications.length === 0) {
        expect.fail("No notifications appeared.");
      } else {
        expect.fail(
          `None of these notifications matched the target: ${messages.map((msg) => `"${msg}"`).join(", ")}`
        );
      }
    } else {
      // re-throwing error.
      throw err;
    }
  }
  return matchedMessage!;
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

export async function actAndAwaitUpdate(
  path: string,
  action: () => Promise<void>,
  timeout = 15000
) {
  const originalParsedInput = JSON.parse(fs.readFileSync(path, "utf-8"));
  if (
    !("data" in originalParsedInput) ||
    !("uniqID" in originalParsedInput) ||
    !("timestamp" in originalParsedInput)
  ) {
    console.log(
      "Object in ",
      originalParsedInput,
      "does not have the expected structure."
    );
    console.log(fs.readFileSync(path, "utf-8"));
  }
  expect(originalParsedInput).to.have.property("data");
  expect(originalParsedInput).to.have.property("uniqID");
  expect(originalParsedInput).to.have.property("timestamp");

  console.log("Original: ");
  console.log(originalParsedInput.uniqID);
  console.log(originalParsedInput.timestamp);

  await action();

  let updatedData;
  await VSBrowser.instance.driver.wait(async () => {
    try {
      const currentParsedInput = JSON.parse(fs.readFileSync(path, "utf-8"));
      if (currentParsedInput.uniqID === originalParsedInput.uniqID) {
        console.log("Update not complete.");
      } else {
        console.log("Setting updated data.");
        updatedData = currentParsedInput;
        return true;
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.log("Caught file mid-write");
      } else {
        throw err;
      }
    }
    // Default wait for wait() is too short for this case.
    await new Promise((r) => setTimeout(r, 1000));
    console.log("Go around");
    return false;
  }, timeout);

  console.log("returning updated data");
  console.log(updatedData);
  return updatedData!.data;
}
