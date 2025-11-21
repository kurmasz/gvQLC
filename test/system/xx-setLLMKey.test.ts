/************************************************************************************
 *
 * exportQuizQuestions.test.ts
 *
 * Test the exportQuizQuestions command.
 *
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 *
 * (C) 2025 Phuc Le
 * *********************************************************************************/

import {
  Workbench,
  WebDriver,
  WebView,
  VSBrowser,
  NotificationType,
  TextEditor,
  InputBox
} from "vscode-extension-tester";
import { By, until, Key } from "selenium-webdriver";
import {
  pause,
  logAllNotifications,
  waitForNotification,
  openWorkspace,
  openTempWorkspace,
  assertNumNotifications,
  dismissAllNotifications,
  actAndAwaitUpdate,
} from "../helpers/systemHelpers";
import { quizQuestionsFileName } from "../../src/sharedConstants";

import { expect } from "chai";
import * as path from "path";
import * as fs from "fs";

describe("Set LLM API Key", function () {
  let view: WebView;
  let tempWorkspaceDir: string;

  this.timeout(150_000);

  after(async function () {
    await VSBrowser.instance.driver.switchTo().defaultContent();
  });

  it("Opens a workspace", async () => {
    await openWorkspace("cis371_server");
  });

  it("Selects 'Set New API Key' and submits new key with an already existing key", async () => {
    var result = await setLLMKey(0, 'enter');
    expect(result).to.be.equal('add');
  });

  it("Selects 'Set New API Key' but cancels entry with an already existing key", async () => {
    var result = await setLLMKey(0, 'cancel');
    expect(result).to.be.equal('addcancel');
  });

  it("Selects 'Cancel' with an already existing key", async () => {
    var result = await setLLMKey(2);
    expect(result).to.be.equal('cancel');
  });

  it("Selects 'Clear Existing API Key' to clear an existing API Key", async () => {
    var result = await setLLMKey(1);
    expect(result).to.be.equal('clear');
  });

  it("Selects 'Cancel' with no existing key", async () => {
    var result = await setLLMKey(1);
    expect(result).to.be.equal('cancel');
    
  });

  it("Selects 'Set New API Key' and submits new key", async () => {
    var result = await setLLMKey(0, 'enter');
    expect(result).to.be.equal('add');
  });

  it("selects 'Set New API Key' but cancels entry", async () => {
    var result = await setLLMKey(0, 'cancel');
    expect(result).to.be.equal('addcancel');
  });
  

  async function setLLMKey(option: number, final_key: string = 'enter') {
    const driver = VSBrowser.instance.driver;
    await new Workbench().executeCommand("gvQLC: Set LLM API Key");
    await new Promise((res) => setTimeout(res, 3000));
    const inputBox = await InputBox.create();
    const picks = await inputBox.getQuickPicks();
    /* Quick Picks
    'Set New API Key' --> Enter API Key --> Press Enter --> Info Message 'LLM API key stored securely.'
    'Clear Existing API Key' --> Info Message 'LLM API key cleared successfully.'
    'Cancel' --> Closes
    
    Formats
    'Set New API Key'
    'Cancel'

    'Set New API Key'
    'Clear Existing API Key'
    'Cancel'
    */
    var text = '';
    if (option === 0 && picks.length === 3) {
      await inputBox.selectQuickPick(option);
      await inputBox.sendKeys("V");
      await pause(2000);
      
      if (final_key === 'enter') {
        await inputBox.confirm(); //Enter Key
        await waitForNotification(NotificationType.Info, (message) => message === 'LLM API key stored securely.');
        text = 'add';
      } 
      else {
        await inputBox.cancel(); //Escape Key
        text = 'addcancel';
        //Not sure what to check here
      }
    } 
    else if (option === 1 && picks.length === 3) {
      await inputBox.selectQuickPick(option);
      await waitForNotification(NotificationType.Info, (message) => message === 'LLM API key cleared successfully.');
      text = 'clear';
    } 
    else if (option === 2 && picks.length === 3) {
      await inputBox.selectQuickPick(option);
      text = 'cancel';
      // Not sure what to check here
    } 
    else if (option === 0 && picks.length === 2) {
      await inputBox.selectQuickPick(option);
      await inputBox.sendKeys("V");
      await pause(2000);
      
      if (final_key === 'enter') {
        await inputBox.confirm(); //Enter Key
        await waitForNotification(NotificationType.Info, (message) => message === 'LLM API key stored securely.');
        text = 'add';
      } 
      else {
        await inputBox.cancel(); //Escape Key
        text = 'addcancel';
        //Not sure what to check here
      }
    } 
    else if (option === 1 && picks.length === 2) {
      await inputBox.selectQuickPick(option);
      text = 'cancel';
      // Not sure what to check here
    }
    return text;
  }
});
