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
import { pause, readFile } from '../helpers/systemHelpers';
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
        await browser.waitForWorkbench();

        await driver.wait(until.elementLocated(By.id('delete-0')));
        var deleteButton = await view.findWebElement(By.id('delete-0'));
        expect(await deleteButton.isDisplayed()).to.be.true;

        //Need to find a way to correctly undo the delete after it's clicked
        //var data = await loadDataFromFile('gvQLC.quizQuestions.json');
        await verifyQuestionCount(14);
        await pause(10000);
        await deleteButton.click();
        await pause(5000);
        await verifyQuestionCountJSON(13);
    });

    async function verifyQuestionCount(expectedCount: number) {
        const element = await view.findWebElement(By.className('total-count'));
        expect(await element.getText()).to.equal(`Total Questions: ${expectedCount}`);
    }

    async function verifyQuestionCountJSON(expectedCount: number) {
        const jsonFile = await readFile('gvQLC.quizQuestions.json');
        const parsedContent = JSON.parse(jsonFile);
        const dataContent = parsedContent.data;
        console.log(dataContent, dataContent.length);
        expect(await dataContent.length).to.equal(expectedCount);
    }
});
