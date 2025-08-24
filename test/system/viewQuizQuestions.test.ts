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

import { Workbench, WebDriver, WebView, VSBrowser, NotificationType } from 'vscode-extension-tester';
import { By, until, WebElement } from 'selenium-webdriver';
import { logAllNotifications, openWorkspace, waitForNotification } from '../helpers/systemHelpers';
import {verifyQuestionDisplayed, verifySummaryDisplayed, setUpQuizQuestionWebView} from '../helpers/questionViewHelpers';
import {ViewColors} from '../../src/sharedConstants';


import { expect } from 'chai';
import * as path from 'path';

describe('viewQuizQuestions', function () {
    let driver: WebDriver;
    let view: WebView;
    let summaryContainer: WebElement;

    this.timeout(150_000);

    after(async function() {
        await driver.switchTo().defaultContent();
    });

    /////////////////////////
    //
    // Folder with no data
    //
    /////////////////////////
    it('notifies when a folder has no gvQLC data', async () => {
        driver = VSBrowser.instance.driver;

        const workbench = await openWorkspace(driver, 'cis371_server_empty');
        await workbench.executeCommand('gvQLC: View Quiz Questions');

        await waitForNotification(NotificationType.Info, (message) => message === 'No personalized questions added yet!');
    });

    /////////////////////////
    //
    // Folder with data
    //
    ///////////////////////// 
    it('opens the folder, runs the command and shows the title and total questions', async () => {      
        ({view, summaryContainer} = await setUpQuizQuestionWebView(driver, 'cis371_server', '14'));
    });

    it('displays the first queston', async () => {
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

    it('displays the third queston', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 2,
            rowLabel: '2a',
            color: ViewColors.GREEN,
            file: 'awesome/my_http_server.py',
            code: "        list_directory += f'<li><a href=\"{file}\">{file}</a></li>'",
            question: "Why is `file` listed twice?",
        });
    });

    it('displays the fourth queston', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 3,
            rowLabel: '2b',
            color: ViewColors.GREEN,
            file: 'awesome/my_http_server.py',
            code: "        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)",
            question: "What is `SO_REUSEADDR`?",
        });
    });

    it('displays the eigth question', async () => {
        const expected = `        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line("Content-Type: text/html")
        socket.send_text_line(f"Content-Length: {len(message) + 2}") # +2 for CR/LF
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 7,
            rowLabel: '5a',
            color: ViewColors.YELLOW,
            file: 'george/my_http_server.py',
            code: expected,
            question: "What is the +2 for?",
        });
    });

    it('displays a blue question', async () => {
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
    });

    it('displays the last question', async () => {
        await verifyQuestionDisplayed(view, {
            rowIndex: 13,
            rowLabel: '8b',
            color: ViewColors.GREEN,
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

       // summaryContainer = await view.findWebElement(By.css('#summaryTableContainer'));
        expect(await summaryContainer.isDisplayed()).to.be.true;

        const header = await summaryContainer.findElement(By.css('h2'));
        expect(await header.getText()).to.equal('Student Question Summary');
    });

    it('displays all students in alphabetical order', async () => {
        // IMPLEMENT ME!
        expect(true).to.be.false;
    });

    it('generates a correct summary for first student', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'antonio',
            questionCount: 2,
            color: ViewColors.GREEN,
            hasQuestions: true
        });
    });

    it('generates a correct summary for awesome', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'awesome',
            questionCount: 2,
            color: ViewColors.GREEN,
            hasQuestions: true
        });
    });

    it('generates a correct summary for caleb', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'caleb',
            questionCount: 1,
            color: ViewColors.YELLOW,
            hasQuestions: true
        });
    });

    it('generates a correct summary for larry', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'larry',
            questionCount: 0,
            color: ViewColors.RED,
            hasQuestions: false
        });
    });

    it('generates a correct summary for george', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'george',
            questionCount: 1,
            color: ViewColors.YELLOW,
            hasQuestions: true
        });
    });

    it('generates a correct summary for last student', async () => {
        verifySummaryDisplayed(summaryContainer, {
            name: 'uncle_bob',
            questionCount: 1,
            color: ViewColors.YELLOW,
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
});
