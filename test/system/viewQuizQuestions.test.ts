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

import {WebView, VSBrowser, NotificationType, Workbench } from 'vscode-extension-tester';
import { By, WebElement } from 'selenium-webdriver';
import { logAllNotifications, openWorkspace, waitForNotification } from '../helpers/systemHelpers';
import {verifyQuestionDisplayed, verifySummaryDisplayed, setUpQuizQuestionWebView} from '../helpers/questionViewHelpers';
import {ViewColors} from '../../src/sharedConstants';


import { expect } from 'chai';

describe('viewQuizQuestions', function () {
    let view: WebView;
    let summaryContainer: WebElement;

    this.timeout(150_000);

    after(async function() {
        await VSBrowser.instance.driver.switchTo().defaultContent();
    });

    /////////////////////////
    //
    // Folder with no data
    //
    /////////////////////////
    it('notifies when a folder has no gvQLC data', async () => {
        await openWorkspace( 'cis371_server_empty');
        await (new Workbench()).executeCommand('gvQLC: View Quiz Questions');

        await waitForNotification(NotificationType.Info, (message) => message === 'No personalized questions added yet!');
    });

    /////////////////////////
    //
    // Folder with data
    //
    ///////////////////////// 
    it('opens the folder, runs the command and shows the title and total questions', async () => {      
        ({view, summaryContainer} = await setUpQuizQuestionWebView('cis371_server', '14'));
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

    it('Refreshes the page', async () => {
        expect(await view.isDisplayed()).to.be.true;
        var refreshBtn = await view.findWebElement(By.id('refreshBtn'));
        expect(await refreshBtn.isDisplayed()).to.be.true;
        await refreshBtn.click();
        expect(await view.isDisplayed()).to.be.true;
        var expectedNew = `                while line := file.readline():
                    socket.send_text_line(line)`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 0,
            rowLabel: '1a',
            color: ViewColors.GREEN,
            file: 'antonio/my_http_server.py',
            code: expectedNew,
            question: "Explain the difference between `=` and `:=`",
        });
    });

    it('Saves the updated question', async () => {

        // Verifies original text
        var question = await view.findElement(By.id('question-0'));
        expect(question.getText()).to.be("Explain the difference between `=` and `:=`");

        // Sends new text to question text area
        var newQuestion = "Explain the difference between `=` and `:=`. Hello";
        question.sendKeys(". Hello");

        // Clicks the save button
        var tbody = await view.findElement(By.css('tbody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        var buttons = await tds[4].findElements(By.css('button'));
        buttons[0].click();

        // Clicks the refresh button
        var refreshBtn = await view.findWebElement(By.id('refreshBtn'));
        await refreshBtn.click();

        // Confirms the change
        var question = await view.findElement(By.id('question-0'));
        expect(question.getText()).to.be(newQuestion);
     
    });

    it('Reverts the changes to a question', async () => {
        // Verify original question
        var question = await view.findElement(By.id('question-0'));
        expect(question.getText()).to.be("Explain the difference between `=` and `:=`");

        // Add text to question
        question.sendKeys(". Hello");

        // Verify text was added
        expect(question.getText()).to.be("Explain the difference between `=` and `:=`. Hello");

        // Clicks the revert button
        var tbody = await view.findElement(By.css('tbody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        var buttons = await tds[4].findElements(By.css('button'));
        buttons[1].click();

        // Expects question text to revert to original
        expect(question.getText()).to.be("Explain the difference between `=` and `:=`");
    });

    it('Copies the full question when no text is highlighted', async () => {
        //Verifies the question text to copy
        var question = await view.findElement(By.id('question-0'));
        expect(question.getText()).to.be("Explain the difference between `=` and `:=`");

        //Finds and clicks the copy button
        var tbody = await view.findElement(By.css('tbody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        var buttons = await tds[4].findElements(By.css('button'));
        buttons[3].click();

        // Verifies it was copied to clipboard
        expect(navigator.clipboard.readText()).to.be("Explain the difference between `=` and `:=`");
    });

    it('Copies part of the question when text is highlighted', async () => {
        var tbody = await view.findElement(By.css('tbody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        // Find question text and highlight an area
        var question = await tds[3].findElement(By.id('question-0')) as unknown as HTMLTextAreaElement;
        expect(question.value).to.be("Explain the difference between `=` and `:=`");
        question.selectionStart = 0;
        question.selectionEnd = 10;

        // Click the copy button
        var buttons = await tds[4].findElements(By.css('button'));
        buttons[3].click();
        
        // Confirm only highlighted section was copied
        expect(navigator.clipboard.readText()).to.be("Explain the");
    });

    it('Excludes a question when the "Exclude Question" box is checked', async () => {
        var checkbox = await view.findWebElement(By.id('exclude-0'));
        // Originally not excluded
        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal('false');
        
        // Should be excluded
        await checkbox.click();
        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal('true');

        // Unexclude it
        await checkbox.click();
        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal('false');
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
        var student_names = [];
        var alphabetical_names = [];
        const table = await summaryContainer.findElement(By.css('table'));
        const tbody = await table.findElement(By.css('tbody'));
        const trs = await tbody.findElements(By.css('tr'));
        for (let i = 0; i < trs.length; i++) {
            const tds = await trs[i].findElements(By.css('td'));
            var student_name = await tds[0].getText();
            student_names.push(student_name);
        }
        alphabetical_names = student_names.sort();
        expect(student_names == alphabetical_names).to.be.true;
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
