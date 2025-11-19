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


import {WebView, VSBrowser } from 'vscode-extension-tester';
import { By, WebElement } from 'selenium-webdriver';
import { pause } from '../helpers/systemHelpers';
import {setUpQuizQuestionWebView} from '../helpers/questionViewHelpers';

import { expect } from 'chai';

describe('viewQuizQuestionsFileLink', function () {
    let view: WebView;
    let summaryContainer: WebElement;

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
        ({view, summaryContainer} = await setUpQuizQuestionWebView('cis371_server', '14'));
    });

    it('opens the link correctly when clicked', async () => {
        var driver = VSBrowser.instance.driver;

        var windows = await driver.getAllWindowHandles();
        var origWindow = await driver.getWindowHandle();

        console.log(windows);
        console.log(origWindow);

        var filePath = await view.findWebElement(By.css('#filepath-0'));
        await filePath.click();
        await pause(1000);
        await driver.switchTo().defaultContent();

        var windows = await driver.getAllWindowHandles();
        var newWindow = await driver.getWindowHandle();

        console.log(windows);
        console.log(newWindow);
        expect(newWindow).to.not.equal(origWindow);
        
        await driver.close();
        await pause(1000);
        await driver.switchTo().window(origWindow);
        
        var windows = await driver.getAllWindowHandles();
        var finalWindow = await driver.getWindowHandle();

        console.log(windows);
        console.log(finalWindow);
        expect(finalWindow).to.be.equal(origWindow);
    });
});
