/************************************************************************************
 * 
 * viewQuizQuestions.test.ts
 * 
 * Test the viewQuizQuestions command.
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import { EditorView, Workbench, WebDriver, WebView, VSBrowser, NotificationType } from 'vscode-extension-tester';
import { By, until, WebElement } from 'selenium-webdriver';
import { logAllNotifications, waitForNotification } from '../helpers/systemHelpers';
import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';

describe('viewQuizQuestions', function () {
    let driver: WebDriver;
    let workbench: Workbench;
    let view: WebView;
    let summaryContainer: WebElement;

    const GREEN = 'rgba(0, 128, 0, 1)';
    const YELLOW = 'rgba(255, 255, 0, 1)';

    this.timeout(150_000);

    it.skip('notifies when a folder has no gvQLC data', async () => {
        driver = VSBrowser.instance.driver;

        // Open the folder
        await VSBrowser.instance.openResources(path.join('test-fixtures', 'cis371_server_empty'), async () => {
            const selector = By.css('[aria-label="Explorer Section: cis371_server_empty"]');
            const element = await driver.wait(until.elementLocated(selector), 10_000);
            await driver.wait(until.elementIsVisible(element), 5_000);
        });

        workbench = new Workbench();
        await workbench.wait();

        // Run the command
        await workbench.executeCommand('gvQLC: View Quiz Questions');

        await waitForNotification(NotificationType.Info, (message) => message === 'No personalized questions added yet!');
    });

    it('opens the folder, runs the command and shows the title and total questions', async () => {
        driver = VSBrowser.instance.driver;
        // Open the folder
        console.log("Here A");
        const folder = path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'cis371_server');
        // Print the absolute path
        console.log('Resolved folder path:', folder);

        // Check if it exists
        if (fs.existsSync(folder)) {
            console.log('✅ Folder exists.');
        } else {
            console.error('❌ Folder does NOT exist!');
        }
        await VSBrowser.instance.openResources(folder, async () => {
            const selector = By.css('[aria-label="Explorer Section: cis371_server"]');
            console.log('Here B');
            const element = await driver.wait(until.elementLocated(selector), 10_000);
            console.log('Here C');
            await driver.wait(until.elementIsVisible(element), 5_000);
            console.log('Here D');
        });
        console.log('Here E');

        workbench = new Workbench();
        await workbench.wait();
        console.log(await new EditorView().getOpenEditorTitles());


        // Run the command
        console.log('Here F');
        await workbench.executeCommand('gvQLC: View Quiz Questions');
        await new Promise(res => setTimeout(res, 10000)); // crude but useful
        await logAllNotifications();

        const tabs = await driver.findElements(By.css('.tab-label'));
        console.log('Tabs 1:', await Promise.all(tabs.map(t => t.getText())));

        console.log('Here G');
        const tab = await driver.wait(until.elementLocated(By.css('[aria-label="View Quiz Questions"]')), 15_000);
        console.log('Here H');
        await driver.wait(until.elementIsVisible(tab), 5_000);
        console.log('Here I');
        /*
        const editorView = new EditorView();
        const titles = await editorView.getOpenEditorTitles();
        const tabIndex = titles.indexOf('View Quiz Questions')
        console.log(tabIndex)
        */

        // Switch to the frame containing the new view
        view = new WebView();
        await view.switchToFrame();
        console.log('Here J');
        // Check the title and number of questions.
        await driver.wait(until.elementLocated(By.css('h1')));
        console.log('Here K');
        const element = await view.findWebElement(By.css('h1'));
        expect(await element.getText()).has.string('All Quiz Questions');
        console.log('Here L');
        const element2 = await view.findWebElement(By.css('.total-count'));
        expect(await element2.getText()).has.string('Total Questions: 5');
        console.log('Here M');
    });

    it('displays the first queston', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 0,
            rowLabel: '1a',
            color: GREEN,
            file: 'awesome/my_http_server.py',
            code: "        list_directory += f'<li><a href=\"{file}\">{file}</a></li>'",
            question: "Why is `file` listed twice?",
        });
    });

    it('displays the second queston', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 1,
            rowLabel: '1b',
            color: GREEN,
            file: 'awesome/my_http_server.py',
            code: "        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)",
            question: "What is `SO_REUSEADDR`?",
        });
    });

    it('displays the fifth question', async () => {
        const expected = `        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line("Content-Type: text/html")
        socket.send_text_line(f"Content-Length: {len(message) + 2}") # +2 for CR/LF
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 4,
            rowLabel: '4a',
            color: YELLOW,
            file: 'george/my_http_server.py',
            code: expected,
            question: "What is the +2 for?",
        });
    });

    it('does not initially display the summary', async () => {
        const container = await view.findWebElement(By.css('#summaryTableContainer'));
        expect(await container.isDisplayed()).to.be.false;
    });

    it('displays the sudent summary when "Toggle Student Summary" clicked.', async () => {
        console.log('Here 1');
        const button = await view.findWebElement(By.id('toggleSummaryBtn'));
        console.log('Here 2');
        expect(await button.isDisplayed()).to.be.true;
        console.log('Here 3');
        await button.click();
        console.log('here 4');

        summaryContainer = await view.findWebElement(By.css('#summaryTableContainer'));
        console.log('Here 5');
        expect(await summaryContainer.isDisplayed()).to.be.true;
        console.log('Here 6');

        const header = await summaryContainer.findElement(By.css('h2'));
        expect(await header.getText()).to.equal('Student Question Summary');
    });

    it('generates a correct summary for student 1', () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'awesome',
            questionCount: 2,
            color: GREEN,
            hasQuestions: true
        });
    });

    it('generates a correct summary for student 2', () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'caleb.test@ug.edu.gh',
            questionCount: 1,
            color: YELLOW,
            hasQuestions: true
        });
    });

    it('generates a correct summary for student 4', () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'george',
            questionCount: 1,
            color: YELLOW,
            hasQuestions: true
        });
    });
});

type QuestionData = {
    rowIndex: number,
    rowLabel: string,
    color: string,
    file: string,
    code: string,
    question: string
};

async function verifyQuestionDisplayed(view: WebView, questionData: QuestionData) {
    const row = await view.findWebElement(By.css(`#row-${questionData.rowIndex}`));
    const cells = await row.findElements(By.css('td'));

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

async function verifySummaryDisplayed(container: WebElement, summaryData: SummaryData) {
    const row = container.findElement(By.xpath(`.//tr[td[1][contains(normalize-space(.), "${summaryData.name}")]]`));
    expect(await row.getCssValue('background-color')).to.equal(summaryData.color);

    const cells = await row.findElements(By.css('td'));
    expect(await cells[1].getText()).to.equal(summaryData.questionCount.toString());
    const expected = summaryData.hasQuestions ? '✓' : '';
    expect(await cells[2].getText()).to.equal(expected);
}
