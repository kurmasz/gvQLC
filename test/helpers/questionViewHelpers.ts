/************************************************************************************
 * 
 * questionViewHelpers.ts
 * 
 * Helpers for testing the quiz question view
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/


import { WebDriver, VSBrowser, Workbench, WebView } from 'vscode-extension-tester';
import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import * as path from 'path';

export async function setUpQuizQuestionWebView(driver: WebDriver, folder: string, expectedQuestionTotal: string) : Promise<{
    view: WebView;
    summaryContainer: WebElement;
}> {

    let basename = path.basename(folder);
    await VSBrowser.instance.openResources(folder, async () => {
        const selector = By.css(`[aria-label="Explorer Section: ${basename}"]`);
        const element = await driver.wait(until.elementLocated(selector), 10_000);
        await driver.wait(until.elementIsVisible(element), 5_000);
    });

    const workbench = new Workbench();
    await workbench.wait();
    // console.log(await new EditorView().getOpenEditorTitles());


    // Run the command
    await workbench.executeCommand('gvQLC: View Quiz Questions');
    await new Promise(res => setTimeout(res, 10000)); // crude but useful

    // const tabs = await driver.findElements(By.css('.tab-label'));
    // console.log('Tabs 1:', await Promise.all(tabs.map(t => t.getText())));

    const tab = await driver.wait(until.elementLocated(By.css('[aria-label="View Quiz Questions"]')), 15_000);
    await driver.wait(until.elementIsVisible(tab), 5_000);

    // Switch to the frame containing the new view
    const view = new WebView();
    await view.switchToFrame();

    // Check the title and number of questions.
    await driver.wait(until.elementLocated(By.css('h1')));
    const element = await view.findWebElement(By.css('h1'));
    expect(await element.getText()).has.string('All Quiz Questions');
    const element2 = await view.findWebElement(By.css('.total-count'));
    expect(await element2.getText()).to.have.string(`Total Questions: ${expectedQuestionTotal}`);

    const summaryContainer = await view.findWebElement(By.css('#summaryTableContainer'));

    return {view, summaryContainer};
}

type QuestionData = {
    rowIndex: number,
    rowLabel: string,
    color: string,
    file: string,
    code: string,
    question: string
};

export async function verifyQuestionDisplayed(view: WebView, questionData: QuestionData) {
    const row = await view.findWebElement(By.css(`#row-${questionData.rowIndex}`));
    const cells = await row.findElements(By.css('td'));
    expect(await row.isDisplayed()).to.be.true;

    expect(await cells[0].getText()).to.equal(questionData.rowLabel);
    expect(await cells[0].getCssValue('background-color')).to.equal(questionData.color);

    expect(await cells[1].getText()).to.equal(questionData.file);

    const codeArea = await cells[2].findElement(By.css('textarea'));
    const actualText = await codeArea.getText();
    if (actualText !== questionData.code) {
        console.log("Expected");
        console.log(questionData.code);
        console.log("Actual");
        console.log(await codeArea.getText());
    }
    expect(actualText).to.equal(questionData.code);

    const questionArea = await cells[3].findElement(By.css('textArea'));
    expect(await questionArea.getText()).to.equal(questionData.question);
}

type SummaryData = {
    name: string,
    questionCount: number,
    hasQuestions: boolean,
    color: string,
};

export async function verifySummaryDisplayed(container: WebElement, summaryData: SummaryData) {
    const row = await container.findElement(By.xpath(`.//tr[td[1][contains(normalize-space(.), "${summaryData.name}")]]`));
    expect(await row.getCssValue('background-color')).to.equal(summaryData.color);

    const cells = await row.findElements(By.css('td'));
    expect(await cells[1].getText()).to.equal(summaryData.questionCount.toString());
    const expected = summaryData.hasQuestions ? '✓' : '✗';
    expect(await cells[2].getText()).to.equal(expected);
}

export async function verifyVisibility(container: WebElement, expectedVisibility: Record<string, boolean>) {
    const tbody = await container.findElement(By.css('#questionsTableBody'));
    const rows = await tbody.findElements(By.css('tr'));
    for (const row of rows) {
        const label = await row.getAttribute('data-label');
            expect(await container.isDisplayed(), `Visiblity of ${label} should be ${expectedVisibility[label]}`).to.equal(expectedVisibility[label]);        
    }
}