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

describe('viewQuizQuestions', function () {
    let driver: WebDriver;
    let workbench: Workbench;
    let view: WebView;
    let summaryContainer: WebElement;

    const GREEN = 'rgba(0, 128, 0, 1)';
    const YELLOW = 'rgba(255, 255, 0, 1)';

    this.timeout(150_000);

    /////////////////////////
    //
    // Folder with no data
    //
    /////////////////////////
    it('notifies when a folder has no gvQLC data', async () => {
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

    /////////////////////////
    //
    // Folder with data
    //
    ///////////////////////// 
    it('opens the folder, runs the command and shows the title and total questions', async () => {

        // Open the folder
        const folder = path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'cis371_server');

        await VSBrowser.instance.openResources(folder, async () => {
            const selector = By.css('[aria-label="Explorer Section: cis371_server"]');
            const element = await driver.wait(until.elementLocated(selector), 10_000);
            await driver.wait(until.elementIsVisible(element), 5_000);
        });

        workbench = new Workbench();
        await workbench.wait();
        console.log(await new EditorView().getOpenEditorTitles());


        // Run the command
        await workbench.executeCommand('gvQLC: View Quiz Questions');
        await new Promise(res => setTimeout(res, 10000)); // crude but useful

        // const tabs = await driver.findElements(By.css('.tab-label'));
        // console.log('Tabs 1:', await Promise.all(tabs.map(t => t.getText())));

        const tab = await driver.wait(until.elementLocated(By.css('[aria-label="View Quiz Questions"]')), 15_000);
        await driver.wait(until.elementIsVisible(tab), 5_000);

        // Switch to the frame containing the new view
        view = new WebView();
        await view.switchToFrame();

        // Check the title and number of questions.
        await driver.wait(until.elementLocated(By.css('h1')));
        const element = await view.findWebElement(By.css('h1'));
        expect(await element.getText()).has.string('All Quiz Questions');
        const element2 = await view.findWebElement(By.css('.total-count'));
        expect(await element2.getText()).has.string('Total Questions: 12');
    });

    it('defaults to displaying 15 rows', async () => {
        // Make sure the pagination is set to 15. Otherwise, tests further down will break.
        const element3 = await view.findWebElement(By.css('#rowsPerPage option[value="15"]'));
        console.log('Attribute value: ');
        console.log(await element3.getAttribute('selected'));
        expect(await element3.getAttribute('selected') !== null);
    });

    it('shows all 12 rows fit on one page', async () => {
        const element = await view.findWebElement(By.css('#totalPagesDisplay'));
        expect(await element.getText()).to.equal("1");
    });

    it('displays the first queston', async () => {
        const expected = `                while line := file.readline():
                    socket.send_text_line(line)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 0,
            rowLabel: '1a',
            color: GREEN,
            file: 'antonio/my_http_server.py',
            code: expected,
            question: "Explain the difference between `=` and `:=`",
        });
    });

    it('displays the third queston', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 2,
            rowLabel: '2a',
            color: GREEN,
            file: 'awesome/my_http_server.py',
            code: "        list_directory += f'<li><a href=\"{file}\">{file}</a></li>'",
            question: "Why is `file` listed twice?",
        });
    });

    it('displays the fourth queston', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 3,
            rowLabel: '2b',
            color: GREEN,
            file: 'awesome/my_http_server.py',
            code: "        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)",
            question: "What is `SO_REUSEADDR`?",
        });
    });

    it('displays the seventh question', async () => {
        const expected = `        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line("Content-Type: text/html")
        socket.send_text_line(f"Content-Length: {len(message) + 2}") # +2 for CR/LF
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 6,
            rowLabel: '5a',
            color: YELLOW,
            file: 'george/my_http_server.py',
            code: expected,
            question: "What is the +2 for?",
        });
    });

    it('displays the last question', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 11,
            rowLabel: '8b',
            color: GREEN,
            file: 'uncle_bob/my_http_server.py',
            code: " if os.path.isdir(path) or os.path.isdir(f'{path}/') or path[-1] == '/':",
            question: "What is the significance of `path[-1] == '/'? What exactly is being checked, and what does that mean at a high level? ",
        });
    });

    /////////////////////////
    //
    // Student Summary
    //
    /////////////////////////
    it('does not initially display the summary', async () => {
        const container = await view.findWebElement(By.css('#summaryTableContainer'));
        expect(await container.isDisplayed()).to.be.false;
    });

    it('displays the sudent summary when "Toggle Student Summary" clicked.', async () => {
        const button = await view.findWebElement(By.id('toggleSummaryBtn'));
        expect(await button.isDisplayed()).to.be.true;
        await button.click();

        summaryContainer = await view.findWebElement(By.css('#summaryTableContainer'));
        expect(await summaryContainer.isDisplayed()).to.be.true;

        const header = await summaryContainer.findElement(By.css('h2'));
        expect(await header.getText()).to.equal('Student Question Summary');
    });

    it('generates a correct summary for first student', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'antonio',
            questionCount: 2,
            color: GREEN,
            hasQuestions: true
        });
    });

    it('generates a correct summary for awesome', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'awesome',
            questionCount: 2,
            color: GREEN,
            hasQuestions: true
        });
    });

    it('generates a correct summary for caleb', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'caleb.test@ug.edu.gh',
            questionCount: 1,
            color: YELLOW,
            hasQuestions: true
        });
    });

    it('generates a correct summary for george', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'george',
            questionCount: 1,
            color: YELLOW,
            hasQuestions: true
        });
    });

    it('generates a correct summary for last student', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'uncle_bob',
            questionCount: 1,
            color: YELLOW,
            hasQuestions: true
        });
    });

    it('hides the summary when toggled', async () => {
        const button = await view.findWebElement(By.id('toggleSummaryBtn'));
        expect(await button.isDisplayed()).to.be.true;
        await button.click();

        const container = await view.findWebElement(By.css('#summaryTableContainer'));
        expect(await container.isDisplayed()).to.be.false;
    });

    /////////////////////////
    //
    // Paganation
    //
    /////////////////////////
    it('Only shows first ten when paganation set to 10', async () => {
        const rowsSelect = await driver.findElement(By.id("rowsPerPage"));
        await rowsSelect.click();
        const option10 = await rowsSelect.findElement(By.css('option[value="10"]'));
        await option10.click();
    });

    it('shows there are now two pages', async () => {
        const element = await view.findWebElement(By.css('#totalPagesDisplay'));
        expect(await element.getText()).to.equal("2");
    });

    it('displays the first queston (when two pages)', async () => {
        const expected = `                while line := file.readline():
                    socket.send_text_line(line)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 0,
            rowLabel: '1a',
            color: GREEN,
            file: 'antonio/my_http_server.py',
            code: expected,
            question: "Explain the difference between `=` and `:=`",
        });
    });

    it('displays the ninth queston (when two pages)', async () => {
        const expected = `        if path.endswith((".jpeg", ".jpg", ".png", ".gif", ".ico", ".pdf")):
            read_mode = "rb"

        file_size = os.path.getsize(path)
        with open(path, read_mode) as file:
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: {content_type}")
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")

            if read_mode == 'rb':
                socket.send_binary_data_from_file(file, file_size)

            else:
                while line := file.readline():
                    socket.send_text_line(line)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 9,
            rowLabel: '7a',
            color: YELLOW,
            file: 'neptune_man/my_http_server.py',
            code: expected,
            question: "How would read mode ever be anything but `rb`?",
        });
    });

    it('Does not display the 11th row', async () => {
        const row = await view.findWebElement(By.css(`#row-10`));
        const cells = await row.findElements(By.css('td'));
        expect(await row.isDisplayed()).to.be.false;
    });

    it('Does not display the 12th row', async () => {
        const row = await view.findWebElement(By.css(`#row-11`));
        expect(await row.isDisplayed()).to.be.false;
    });

    it('Advances to the next page when I choose page 2', async () => {
        // Finds: <button class="page-ban">2</button>
        const button2 = await driver.findElement(By.xpath("//button[normalize-space()='2']"));
        await button2.click();

        const row0 = await view.findWebElement(By.css(`#row-0`));
        expect(await row0.isDisplayed()).to.be.false;

        const row9 = await view.findWebElement(By.css(`#row-9`));
        expect(await row9.isDisplayed()).to.be.false;

        const row10 = await view.findWebElement(By.css(`#row-10`));
        expect(await row10.isDisplayed()).to.be.true;

        await verifyQuestionDisplayed(view, {
            rowIndex: 11,
            rowLabel: '8b',
            color: GREEN,
            file: 'uncle_bob/my_http_server.py',
            code: " if os.path.isdir(path) or os.path.isdir(f'{path}/') or path[-1] == '/':",
            question: "What is the significance of `path[-1] == '/'? What exactly is being checked, and what does that mean at a high level? ",
        });
    });


    it('Displays summary for all rows, even if not all rows are currently displayed', async () => {
        const button = await view.findWebElement(By.id('toggleSummaryBtn'));
        expect(await button.isDisplayed()).to.be.true;
        await button.click();

        summaryContainer = await view.findWebElement(By.css('#summaryTableContainer'));
        expect(await summaryContainer.isDisplayed()).to.be.true;

        const header = await summaryContainer.findElement(By.css('h2'));
        expect(await header.getText()).to.equal('Student Question Summary');

        // first row
        verifySummaryDisplayed(summaryContainer, {
            name: 'antonio',
            questionCount: 2,
            color: GREEN,
            hasQuestions: true
        });

        // last row
        verifySummaryDisplayed(summaryContainer, {
            name: 'uncle_bob',
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

async function verifySummaryDisplayed(container: WebElement, summaryData: SummaryData) {
    const row = container.findElement(By.xpath(`.//tr[td[1][contains(normalize-space(.), "${summaryData.name}")]]`));
    expect(await row.getCssValue('background-color')).to.equal(summaryData.color);

    const cells = await row.findElements(By.css('td'));
    expect(await cells[1].getText()).to.equal(summaryData.questionCount.toString());
    const expected = summaryData.hasQuestions ? '✓' : '';
    expect(await cells[2].getText()).to.equal(expected);
}
