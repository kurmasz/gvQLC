/************************************************************************************
 * 
 * viewQuizQuestionsDelete.test.ts
 * 
 * Test the View Quiz Questions's delete button in the UI.
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Zachary Kurmas, Phuc Le
 * *********************************************************************************/


import { WebView, VSBrowser, Workbench, until } from 'vscode-extension-tester';
import { By, WebElement } from 'selenium-webdriver';
import { pause } from '../helpers/systemHelpers';
import { setUpQuizQuestionWebView } from '../helpers/questionViewHelpers';

import { expect } from 'chai';

describe('viewQuizQuestions Delete', function () {
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

    it('deletes the entry when clicked', async () => {
        const driver = VSBrowser.instance.driver;
        var browser = VSBrowser.instance;
        browser.waitForWorkbench();

        var deleteButton = await view.findWebElement(By.css('#delete-0'));
        expect(await deleteButton.isDisplayed()).to.be.true;

        //Need to find a way to correctly undo the delete after it's clicked
        //var data = await loadDataFromFile('gvQLC.quizQuestions.json');
        await deleteButton.click();

        workbench = new Workbench();
        await driver.wait(until.stalenessOf(workbench));
        await browser.waitForWorkbench();
        
        const editorView = workbench.getEditorView();
        await editorView.openEditor('View Quiz Questions');

        await verifyQuestionCount(13);
        //await saveDataToFile('gvQLC.quizQuestions.json', data);
        //Somehow restore JSON to normal
        //await verifyQuestionCount(14);
    });

    async function verifyQuestionCount(expectedCount: number) {
        const element = await view.findWebElement(By.className('total-count'));
        expect(await element.getText()).to.equal(`Total Questions: ${expectedCount}`);
    }
});
