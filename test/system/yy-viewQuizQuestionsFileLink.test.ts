/************************************************************************************
 * 
 * viewQuizQuestions.test.ts
 * 
 * Test the viewQuizQuestions command.
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Zachary Kurmas, Phuc Le
 * *********************************************************************************/


import {WebView, VSBrowser, Browser, Workbench, until } from 'vscode-extension-tester';
import { By, WebElement } from 'selenium-webdriver';
import { pause } from '../helpers/systemHelpers';
import {setUpQuizQuestionWebView} from '../helpers/questionViewHelpers';

import { expect } from 'chai';

describe('viewQuizQuestions FileLink', function () {
    let view: WebView;
    let summaryContainer: WebElement;
    let workbench: Workbench;

    this.timeout(150_000);

    after(async function() {
        await VSBrowser.instance.driver.switchTo().defaultContent();
    });

    /////////////////////////
    //
    // Folder with data
    //
    ///////////////////////// 
    it('opens the folder, runs the command and shows the title and total questions', async () => {      
        ({view, summaryContainer, workbench} = await setUpQuizQuestionWebView('cis371_server', '14'));
    });

    it('opens the link correctly when clicked', async () => {
        var driver = VSBrowser.instance.driver;
        var browser = VSBrowser.instance;
        browser.waitForWorkbench();
        await driver.wait(until.elementsLocated(By.css('.monaco-workbench')), 15000);

        var editorView = workbench.getEditorView();
        var tabs = await editorView.getOpenTabs();
        //var tabs = await editorView.getOpenEditorTitles(); // Issue here with finding .monaco-workbench element
        console.log(tabs);

        var filePath = await view.findWebElement(By.css('#filepath-0'));
        await filePath.click();
        console.log('clicked');

        workbench = new Workbench();
        await driver.wait(until.stalenessOf(workbench));
        await browser.waitForWorkbench();

        editorView = workbench.getEditorView();
        var newTabs = await editorView.getOpenEditorTitles();
        console.log(newTabs);
    
        expect(tabs).to.not.equal(newTabs);
    });
});
