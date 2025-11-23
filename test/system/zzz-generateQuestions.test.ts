/************************************************************************************
 *
 * generateQuestions.test.ts
 *
 * Test the Generate Questions command.
 *
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 *
 * (C) 2025 Phuc Le
 * *********************************************************************************/

import { WebView, VSBrowser, Workbench, until } from 'vscode-extension-tester';
import { By, WebElement } from 'selenium-webdriver';
import { pause, openFile, readFile, verifyQuestionCountJSON } from '../helpers/systemHelpers';

import { expect } from 'chai';
import * as path from "path";
import * as fs from "fs";

describe('Generate Quiz Questions', function () {
    let view: WebView;

    this.timeout(150_000);

    after(async function() {
        await VSBrowser.instance.driver.switchTo().defaultContent();
    });

    /////////////////////////
    //
    // Folder with data
    //
    ///////////////////////// 
    it('opens the folder, runs the command and shows the title and generate button', async () => {      
        view = await setupGenerateQuestion("cooper/http_socket.py");
    });

    it('enters a prompt', async () => {
        var driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.id('userPrompt')));
        var promtArea = await view.findWebElement(By.id('userPrompt'));

        await pause(5000);
        console.log('found');
        await promtArea.sendKeys("Focus on the first function");
        await pause(5000);
        expect(await promtArea.getAttribute("value")).to.be.equal("Focus on the first function");
    });

    it('generates output', async() => {
        var driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.id('generateBtn')));
        var generateBtn = await view.findWebElement(By.id('generateBtn'));
        await pause(5000);
        console.log('found');
        await generateBtn.click();
        await pause(10000);

        var outputArea = await view.findWebElement(By.id('output-area'));
        await driver.wait(until.elementTextContains(outputArea, "Question 1"));
        expect(await outputArea.getText()).to.be.not.equal("");
    });

    it('saves output', async() => {
        var driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.id('saveBtn')));
        var saveBtn = await view.findWebElement(By.id('saveBtn'));

        await pause(5000);
        console.log('found');
        await saveBtn.click();
        await pause(5000);
        await verifyQuestionCountJSON(18);
    });

    async function setupGenerateQuestion(fileToOpen: string) {
      await openFile(fileToOpen);
      const driver = VSBrowser.instance.driver;
      await new Workbench().executeCommand("gvQLC: Generate Quiz Question");
      await new Promise((res) => setTimeout(res, 1000));

      const tab = await driver.wait(
        until.elementLocated(By.css('[aria-label="Generate Quiz Questions"]')),
        15_000
      );
      await driver.wait(until.elementIsVisible(tab), 5_000);

      // Switch to the frame containing the new view
      const view = new WebView();
      await view.switchToFrame();

      // Check the title and generate button.
      await driver.wait(until.elementLocated(By.id("generateBtn")));
      const element = await view.findWebElement(By.id("generateBtn"));
      expect(await element.getText()).has.string("Generate Questions");

      return view;
    }
});
