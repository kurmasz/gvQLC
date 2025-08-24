/************************************************************************************
 * 
 * addQuizQuestions.test.ts
 * 
 * Test the addQuizQuestions command.
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import { Workbench, WebDriver, WebView, VSBrowser, NotificationType, TextEditor } from 'vscode-extension-tester';
import { By, until, WebElement } from 'selenium-webdriver';
import { logAllNotifications, waitForNotification, openFile, openWorkspace, openTempWorkspace } from '../helpers/systemHelpers';

import { expect } from 'chai';
import * as path from 'path';

describe('addQuizQuestions', function () {
    let driver: WebDriver;
    let view: WebView;
    let summaryContainer: WebElement;

    this.timeout(150_000);

    after(async function () {
        await driver.switchTo().defaultContent();
    });

    //
    // No file / no selection / no previous questions  
    //
    it('Notifies when no file is open in project without existing questions', async () => {
        driver = VSBrowser.instance.driver;

        const workbench = await openWorkspace(driver, 'cis371_server_empty');
        await workbench.executeCommand('gvQLC: Add Quiz Question');
        await waitForNotification(NotificationType.Error, (message) => {
            return message === 'gvQLC: No active editor tab found. (You must have a code snippet selected to add a quiz question.)';
        });
    });

    it('Notifies when no text is selected in open file in project without existing questions', async () => {
        // Open a file
        await openFile('cooper/http_socket.py');

        const workbench = new Workbench();
        await workbench.executeCommand('gvQLC: Add Quiz Question');
        await waitForNotification(NotificationType.Error, (message) => message === 'gvQLC: No code selected. (You must have a code snippet selected to add a quiz question.)');
    });


    //
    // No file / no selection / with previous questions  
    //
    it('Notifies when no file is open in project with existing questions', async () => {
        const workbench = await openWorkspace(driver, 'cis371_server');
        await workbench.executeCommand('gvQLC: Add Quiz Question');

        await waitForNotification(NotificationType.Error, (message) => {
            return message === 'gvQLC: No active editor tab found. (You must have a code snippet selected to add a quiz question.)';
        });
    });

    it('Notifies when no text is selected in open file in project with existing questions', async () => {
        // Open a file
        await openFile('cooper/http_socket.py');

        const workbench = new Workbench();
        await workbench.executeCommand('gvQLC: Add Quiz Question');
        await waitForNotification(NotificationType.Error, (message) => message === 'gvQLC: No code selected. (You must have a code snippet selected to add a quiz question.)');
    });

    //
    // Add to existing questions
    //
    it.skip('Adds a new quiz question to existing questions', async () => {
        const { workbench, tempWorkspaceDir } = await openTempWorkspace(driver, 'cis371_server');
        await openFile('sam/my_http_server.py');
        // await new Promise(res => setTimeout(res, 10000)); // crude but useful

        const editor = new TextEditor();
        await editor.selectText('".html": handle_binary');
        await workbench.executeCommand('gvQLC: Add Quiz Question');
        await new Promise(res => setTimeout(res, 10000)); // crude but useful
   
    });
});