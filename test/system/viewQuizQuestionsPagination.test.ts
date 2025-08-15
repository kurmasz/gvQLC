/************************************************************************************
 * 
 * viewQuizQuestionsPagination.test.ts
 * 
 * Test the pagination aspect of the viewQuizQuestions command.
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import { WebDriver, WebView, VSBrowser } from 'vscode-extension-tester';
import { By, until, WebElement } from 'selenium-webdriver';
import { verifyQuestionDisplayed, verifySummaryDisplayed, setUpQuizQuestionWebView } from '../helpers/questionViewHelpers';
import {ViewColors} from '../../src/sharedConstants';

import { expect } from 'chai';
import * as path from 'path';

describe('viewQuizQuestions pagination', function () {
    let driver: WebDriver;
    let view: WebView;
    let summaryContainer: WebElement;

    this.timeout(150_000);

    after(async function () {
        await driver.switchTo().defaultContent();
    });

    it('opens the folder and runs the command', async () => {
        driver = VSBrowser.instance.driver;
        const folder = path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'cis371_server');
        ({ view, summaryContainer } = await setUpQuizQuestionWebView(driver, folder, '14'));
    });

    it('defaults to displaying 15 rows', async () => {
        // Make sure the pagination is set to 15. Otherwise, tests further down will break.
        const element3 = await view.findWebElement(By.css('#rowsPerPage option[value="15"]'));
        expect(await element3.getAttribute('selected') !== null);
    });

    it('shows that there is only one page', async () => {
        const element = await view.findWebElement(By.css('#totalPagesDisplay'));
        expect(await element.getText()).to.equal("1");

        const pageNumberContainer = await view.findWebElement(By.css('#pageNumbers'));
        const allPageNumbers = await pageNumberContainer.findElements(By.css('.page-btn'));
        expect(allPageNumbers.length).to.equal(1);
        expect(await allPageNumbers[0].getText()).to.equal("1");
    });

    it('disables the navigation buttons', async () => {
        verifyButtonDisabled('#firstPageBtn');
        verifyButtonDisabled('#prevPageBtn');
        verifyButtonDisabled('#nextPageBtn');
        verifyButtonDisabled('#lastPageBtn');
    });

    it('displays the 1st row', async () => {
        const row = await view.findWebElement(By.css(`#row-0`));
        const cells = await row.findElements(By.css('td'));
        expect(await row.isDisplayed()).to.be.true;
    });

    it('displays the last row', async () => {
        const row = await view.findWebElement(By.css(`#row-11`));
        expect(await row.isDisplayed()).to.be.true;
    });

    ////////////////////////////////
    //
    // Set pagination to 10
    //
    ////////////////////////////////
    it('Only shows first ten when paganation set to 10', async () => {
        const rowsSelect = await driver.findElement(By.id("rowsPerPage"));
        await rowsSelect.click();
        const option10 = await rowsSelect.findElement(By.css('option[value="10"]'));
        await option10.click();
    });

    it('shows there are now two pages', async () => {
        const element = await view.findWebElement(By.css('#totalPagesDisplay'));
        expect(await element.getText()).to.equal("2");

        const pageNumberContainer = await view.findWebElement(By.css('#pageNumbers'));
        const allPageNumbers = await pageNumberContainer.findElements(By.css('.page-btn'));
        expect(allPageNumbers.length).to.equal(2);
        expect(await allPageNumbers[0].getText()).to.equal("1");
        expect(await allPageNumbers[0].getText()).to.equal("1");
    });

    it('disables "previous" buttons when on page 1 of 2', async() => {
        verifyButtonDisabled('#firstPageBtn');
        verifyButtonDisabled('#prevPageBtn');
    });

    it('enables "next" buttons when on page 1 of 2', async() => {
        verifyButtonEnabled('#nextPageBtn');
        verifyButtonEnabled('#lastPageBtn');
    });

    it('enables "previous" buttons when on page 2 of 2', async() => {
        verifyButtonEnabled('#firstPageBtn');
        verifyButtonEnabled('#prevPageBtn');
    });

    it('disables "next" buttons when on page 2 of 2', async() => {
        verifyButtonDisabled('#nextPageBtn');
        verifyButtonDisabled('#lastPageBtn');
    });

    it('displays the first queston (when two pages)', async () => {
        const expected = `                while line := file.readline():
                    socket.send_text_line(line)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 0,
            rowLabel: '1a',
            color: ViewColors.GREEN,
            file: 'antonio/my_http_server.py',
            code: expected,
            question: "Explain the difference between `=` and `:=`",
        });
    });

     it('displays the ninth queston (when two pages)', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 9,
            rowLabel: '6b',
            color: ViewColors.BLUE,
            file: 'jim/my_http_server.py',
            code: '    socket.close()',
            question: "What happens if you don't close the socket?"
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

    it('Does not display the 14th row', async () => {
        const row = await view.findWebElement(By.css(`#row-13`));
        expect(await row.isDisplayed()).to.be.false;
    });

    it('Advances to page 2 by number button', async () => {
        // Finds: <button class="page-ban">2</button>
        const button2 = await driver.findElement(By.xpath("//button[normalize-space()='2']"));
        await button2.click();

        const row0 = await view.findWebElement(By.css(`#row-0`));
        expect(await row0.isDisplayed()).to.be.false;

        const row9 = await view.findWebElement(By.css(`#row-9`));
        expect(await row9.isDisplayed()).to.be.false;

        const row10 = await view.findWebElement(By.css(`#row-10`));
        expect(await row10.isDisplayed()).to.be.true;

        const expected = `        server_socket.bind((HOST, port))
        server_socket.listen()`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 10,
            rowLabel: '6c',
            color: ViewColors.BLUE,
            file: 'jim/my_http_server.py',
            code: expected,
            question: "What is the difference between `bind` and `listen`?",
        });

        await verifyQuestionDisplayed(view, {
            rowIndex: 13,
            rowLabel: '8b',
            color: ViewColors.GREEN,
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
            color: ViewColors.GREEN,
            hasQuestions: true
        });

        // last row
        verifySummaryDisplayed(summaryContainer, {
            name: 'uncle_bob',
            questionCount: 1,
            color: ViewColors.YELLOW,
            hasQuestions: true
        });
    });

    

    async function verifyButtonEnabled(id: string, enabled: boolean = true) {
        const button = await view.findWebElement(By.css(id));
        const firstIsDisabled = await button.getAttribute('disabled') !== null;
        expect(firstIsDisabled).to.equal(enabled);
    }

    async function verifyButtonDisabled(id: string) {
        verifyButtonEnabled(id, false);
    }
}); // end describe