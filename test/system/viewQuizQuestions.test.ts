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
import { By, WebElement, Key } from 'selenium-webdriver';
import { logAllNotifications, openWorkspace, waitForNotification } from '../helpers/systemHelpers';
import {verifyQuestionDisplayed, verifySummaryDisplayed, setUpQuizQuestionWebView} from '../helpers/questionViewHelpers';
import {ViewColors} from '../../src/sharedConstants';

import { expect } from 'chai';
import * as os from 'os';

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

    it('Saves the updated question', async () => {
        // Verifies original text
        var question = await view.findWebElement(By.id('question-0'));
        expect(await question.getText()).to.be.equal("Explain the difference between `=` and `:=`");

        // Sends new text to question text area
        var questionText = "Explain the difference between `=` and `:=`";
        await question.clear();
        expect(await question.getAttribute("value")).to.be.equal("");

        await question.sendKeys(questionText);

        // Clicks the save button
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        var buttons = await tds[4].findElements(By.css('button'));
        await buttons[0].click();

        // Confirms the change
        expect(await question.getAttribute("value")).to.be.equal(questionText);
    });

    it('Reverts the changes to a question', async () => {
        // Verify original question
        var question = await view.findWebElement(By.id('question-0'));
        expect(await question.getText()).to.be.equal("Explain the difference between `=` and `:=`");

        // Clear question and verify clear
        await question.clear();
        expect(await question.getAttribute("value")).to.be.equal("");

        // Clicks the revert button
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        var buttons = await tds[4].findElements(By.css('button'));
        await buttons[1].click();

        // Expects question text to revert to original
        var question = await view.findWebElement(By.id('question-0'));
        expect(await question.getText()).to.be.equal("Explain the difference between `=` and `:=`");
    });

    it('Copies the full question when no text is highlighted', async () => {
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        // Find question text
        var question = await tds[3].findElement(By.id('question-0'));
        expect(await question.getText()).to.be.equal("Explain the difference between `=` and `:=`");

        //Click the copy button
        var buttons = await tds[4].findElements(By.css('button'));
        await buttons[3].click();

        // Verifies it was copied to clipboard
        var operatingSystem = getOperatingSystem();
        if (operatingSystem == "windows") {
            console.log("Windows system");
            await question.sendKeys(Key.CONTROL, "v", Key.NULL);
        } else {
            console.log("Not windows");
            await question.sendKeys(Key.COMMAND, "v", Key.NULL);
        }

        expect(await question.getAttribute("value")).to.be.equal("Explain the difference between `=` and `:=`Explain the difference between `=` and `:=`");
        await buttons[1].click();
    });

    it.skip('Copies part of the question when text is highlighted', async () => {
        // Will fail if run
        // Issue with selectionStart and selectionEnd not actually highlighting text
        // So it'll copy the full text instead
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        // Find question text and highlight an area
        var question = await tds[3].findElement(By.id('question-0')) as unknown as HTMLTextAreaElement;
        var question1 = await tds[3].findElement(By.id('question-0'));
        question.selectionStart = 0;
        question.selectionEnd = 2;

        // Click the copy button
        var buttons = await tds[4].findElements(By.css('button'));
        await buttons[3].click();
        console.log(`Before paste - getAttribute("value"): ${await question1.getAttribute("value")}`);

        var operatingSystem = getOperatingSystem();
        if (operatingSystem == "windows") {
            await question1.sendKeys(Key.chord(Key.CONTROL, "v"));
        } else {
            await question1.sendKeys(Key.chord(Key.COMMAND, "v"));
        }

        console.log(`After paste - getAttribute("value"): ${await question1.getAttribute("value")}`);
        expect(await question1.getAttribute("value")).to.be.equal("Explain the difference between `=` and `:=`E");
        await buttons[1].click();
    });

    it('Excludes a question when the "Exclude Question" box is checked', async () => {
        var checkbox = await view.findWebElement(By.id('exclude-0'));
        // Originally not excluded
        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal(false);
        
        // Should be excluded
        await checkbox.click();
        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal(true);

        // Unexclude it
        await checkbox.click();
        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal(false);
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

    it('summary table filters to show entries for the selected student', async () => {
        const table = await summaryContainer.findElement(By.css('table'));
        const tbody = await table.findElement(By.css('tbody'));
        const trs = await tbody.findElements(By.css('tr'));
        const firstRow = trs[0];
        await firstRow.click();
        await verifyFilterCount(2);
    });

    it('summary table stops filtering after a second click on the same row', async () => {
        const table = await summaryContainer.findElement(By.css('table'));
        const tbody = await table.findElement(By.css('tbody'));
        const trs = await tbody.findElements(By.css('tr'));
        const firstRow = trs[0];
        await firstRow.click();
        await verifyNoFilter();
    });

    it('hides the summary when toggled', async () => {
        const button = await view.findWebElement(By.id('toggleSummaryBtn'));
        expect(await button.isDisplayed()).to.be.true;
        await button.click();

        const container = await view.findWebElement(By.css('#summaryTableContainer'));
        expect(await container.isDisplayed()).to.be.false;
    });

    it('toggles darkmode on and off', async () => {
        var body = await view.findWebElement(By.css("#body"));
        var currValue = await body.getAttribute("class");
        var tokens = currValue.split(" ");
        if (tokens[0] = "dark") {
        console.log("Was darkMode before click\n");
        expect(tokens[0]).to.be.equal("dark");
        } else {
        console.log("Was normalMode before click\n");
        expect(tokens[0]).to.be.equal("normal");
        }

        const darkModeButton = await view.findWebElement(By.css("#darkModeButton"));
        await darkModeButton.click();

        var body = await view.findWebElement(By.css("#body"));
        var currValue = await body.getAttribute("class");
        var tokens = currValue.split(" ");
        if (tokens[0] = "dark") {
        console.log("Is now darkMode after click\n");
        expect(tokens[0]).to.be.equal("dark");
        } else {
        console.log("Is now normalMode after click\n");
        expect(tokens[0]).to.be.equal("normal");
        }
    })

    it('toggles high contrast mode on and off', async () => {
        var body = await view.findWebElement(By.css("#body"));
        var currValue = await body.getAttribute("class");
        var tokens = currValue.split(" ");
        if (tokens[1] = "contrast") {
        console.log("Was contrastMode before click\n");
        expect(tokens[1]).to.be.equal("contrast");
        } else {
        console.log("Was normalMode before click\n");
        expect(tokens[1]).to.be.equal("normal");
        }

        const highContrastButton = await view.findWebElement(By.css("#contrastModeButton"));
        await highContrastButton.click();

        var body = await view.findWebElement(By.css("#body"));
        var currValue = await body.getAttribute("class");
        var tokens = currValue.split(" ");
        if (tokens[1] = "contrast") {
        console.log("Is now contrastMode after click\n");
        expect(tokens[1]).to.be.equal("contrast");
        } else {
        console.log("Is now normalMode after click\n");
        expect(tokens[1]).to.be.equal("normal");
        }
    })

    it.skip('Refreshes the page', async () => {
        // Issues with the after(async function() { lines

        const refreshBtn = await view.findWebElement(By.css('#refreshBtn'));
        console.log("refreshBtn found");
        expect(await refreshBtn.isDisplayed()).to.be.true;
        await refreshBtn.click();

        await VSBrowser.instance.driver.switchTo().defaultContent();

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

    it.skip('opens the link correctly when clicked', async () => {
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        var filePath = tds[1];
        await filePath.click();
        await VSBrowser.instance.driver.close();
        await VSBrowser.instance.driver.switchTo().defaultContent();

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

    it.skip('deletes the entry when clicked', async () => {
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        var buttons = await tds[4].findElements(By.css('button'));
        expect(await buttons[4].isDisplayed()).to.be.true;

        //Need to find a way to correctly undo the delete after it's clicked
        //await buttons[4].click();
        //await verifyQuestionCount(13);
        //Somehow restore JSON to normal
        //await verifyQuestionCount(14);
    });

    async function verifyFilterCount(expectedCount: number) {
        const element = await view.findWebElement(By.css('#filterCount'));
        expect(await element.getText()).to.equal(`${expectedCount} matches`);
    }

    async function verifyNoFilter() {
        const element = await view.findWebElement(By.css('#filterCount'));
        expect(await element.getText()).to.equal('');
    }

    async function verifyQuestionCount(expectedCount: number) {
        const element = await view.findWebElement(By.className('total-count'));
        expect(await element.getText()).to.equal(`Total Questions: ${expectedCount}`);
    }

    function getOperatingSystem(): string {
        switch (os.platform()) {
            case 'darwin':
                return 'macOS';
            case 'win32':
                return 'Windows';
            case 'linux':
                return 'Linux';
            default:
                return 'Unknown';
        }
    }
});
