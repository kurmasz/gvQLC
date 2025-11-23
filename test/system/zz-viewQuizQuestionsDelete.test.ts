/************************************************************************************
 * 
 * viewQuizQuestionsDelete.test.ts
 * 
 * Test the View Quiz Questions's delete button in the UI.
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Phuc Le
 * *********************************************************************************/


import { WebView, VSBrowser, Workbench, until } from 'vscode-extension-tester';
import { By, WebElement } from 'selenium-webdriver';
import { pause, readFile, openWorkspace, verifyQuestionCountJSON } from '../helpers/systemHelpers';
import { setUpQuizQuestionWebView, overlap } from '../helpers/questionViewHelpers';

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
    it("Opens a workspace", async () => {
        await openWorkspace("cis371_server");
    });

    it.skip('opens the folder, runs the command and shows the title and total questions', async () => {
        // Timeout issues preventing view from loading correctly
        ({view, summaryContainer, workbench} = await setUpQuizQuestionWebView('cis371_server', '14'));
    });

    it.skip('deletes the entry when clicked', async () => {
        // Timeout issue above means we can't find the HTML elements
        var driver = VSBrowser.instance.driver;
        var deleteButton = await view.findWebElement(By.id('delete-0'));

        await verifyQuestionCount(14);
        await pause(5000);
        var i = 0;
        while (i < 10) {
            const deleteButton = await view.findWebElement(By.id('delete-0'));
            const deleteRect = await deleteButton.getRect();
            const suggestAI = await view.findWebElement(By.id("suggestAI-0"));
            const suggestRect = await suggestAI.getRect();
            const rephraseAI = await view.findWebElement(By.id("rephraseAI-0"));
            const rephraseRect = await rephraseAI.getRect();
            const edit = await view.findWebElement(By.id("edit-0"));
            const editRect = await edit.getRect();
            const copy = await view.findWebElement(By.id("copy-0"));
            const copyRect = await copy.getRect();
            if (!overlap(deleteRect, suggestRect)) {
                break;
            }
            else if (!overlap(deleteRect, rephraseRect)) {
                break;
            }
            else if (!overlap(deleteRect, editRect)) {
                break;
            }
            else if (!overlap(deleteRect, copyRect)) {
                break;
            }
            await pause(1000); //1 second wait
            i += 1;
        }
        console.log('found');
        await deleteButton.click();
        await pause(5000);
        await verifyQuestionCountJSON(13);
    });

    async function verifyQuestionCount(expectedCount: number) {
        const element = await view.findWebElement(By.className('total-count'));
        expect(await element.getText()).to.equal(`Total Questions: ${expectedCount}`);
    }
});
