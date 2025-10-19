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
import { match } from "assert";

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
  const answer = path.resolve(
    path.join(process.cwd(), "test-fixtures", fixtureName)
  );
  const msg = `Fixture path ${answer} should exist but does not.`;
  expect(fs.existsSync(answer), msg).to.be.true;
  console.log(`Fixture ${answer} exists`);
  return answer;
}

export async function openWorkspace(folder: string) {
  return await openWorkspaceFromPath(fixturePath(folder));
}

export async function makeTempCopy(folder: string) {
  const sourceDir = fixturePath(folder);
  const tempWorkspaceDir = await fs.mkdtemp(
    path.resolve(path.join(process.cwd(), "test-fixtures-tmp", folder + "-"))
  );

  console.log(`copying ${sourceDir} to ${tempWorkspaceDir}`);
  await fs.copy(sourceDir, tempWorkspaceDir);

  const msg = `Temp fixture path ${tempWorkspaceDir} should exist but does not.`;
  expect(fs.existsSync(tempWorkspaceDir), msg).to.be.true;
  console.log(`Temp directory ${tempWorkspaceDir} exists.`);
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
  let numNotifications = 0;
  let messages: string[] = [];
  let matchedMessage: string | undefined;
  const center = await new Workbench().openNotificationsCenter();

  try {
    await VSBrowser.instance.driver.wait(async () => {
      numNotifications = 0;
      messages = [];
      const notifications = await center.getNotifications(type);
      if (notifications.length === 0) {
        return false;
      }
      for (const n of notifications) {
        const message = await n.getMessage();
        if (matcher(message)) {
          matchedMessage = message;
          return true;
        } else {
          messages.push(message);
        }
        ++numNotifications;
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

      if (numNotifications === 0) {
        expect.fail("No notifications appeared.");
      } else {
        expect.fail(
          `None of these notifications matched the target: ${messages
            .map((msg) => `"${msg}"`)
            .join(", ")}`
        );
      }
    } else {
      // re-throwing error.
      throw err;
    }
  }
  return matchedMessage!;
}

// Use when debugging why the target string doesn't match
// any of the notifications
export function makeVerboseEqualityMatcher(target: string) {
  return (message: string) => {
    console.log(`Comparing =>${message}<= and =>${target}<=`);
    const answer = message === target;
    console.log("Result: ", answer);
    return answer;
  };
}

export async function logAllNotifications() {
  const center = await new Workbench().openNotificationsCenter();
  const allTypes = [
    NotificationType.Error,
    NotificationType.Warning,
    NotificationType.Info,
  ];
  for (const notificationType of allTypes) {
    let messages: string[] = [];
    for (const n of await center.getNotifications(notificationType)) {
      try {
        messages.push(await n.getMessage());
      } catch (e) {
        messages.push(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
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
