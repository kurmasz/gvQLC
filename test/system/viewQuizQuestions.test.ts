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
import { By, WebElement, Key, until, IRectangle } from 'selenium-webdriver';
import { logAllNotifications, openWorkspace, waitForNotification, pause } from '../helpers/systemHelpers';
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
        const saveButton = await view.findWebElement(By.css("#save-0"));
        await saveButton.click();

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
        const revertButton = await view.findWebElement(By.css("#revert-0"));
        await revertButton.click();

        // Expects question text to revert to original
        var question = await view.findWebElement(By.id('question-0'));
        expect(await question.getText()).to.be.equal("Explain the difference between `=` and `:=`");
    });

    it('Copies the full question when no text is highlighted', async () => {
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        // Find question text
        var question = await tds[2].findElement(By.id('question-0'));
        expect(await question.getText()).to.be.equal("Explain the difference between `=` and `:=`");

        //Click the copy button
        const copyButton = await view.findWebElement(By.css("#copy-0"));
        await copyButton.click();

        // Verifies it was copied to clipboard
        var operatingSystem = getOperatingSystem();
        if (operatingSystem == "macOS") {
            console.log("macOS");
            await question.sendKeys(Key.COMMAND, "v", Key.NULL);
        } else if (operatingSystem == "Linux") {
            console.log("Linux");
            await question.sendKeys(Key.CONTROL, "v", Key.NULL);
        } else {
            console.log("Windows");
            await question.sendKeys(Key.CONTROL, "v", Key.NULL);
        }
        await pause(1000); // 1000 ms = 1 sec
        console.log(await question.getAttribute("value"));
        console.log(await question.getText());

        expect(await question.getAttribute("value")).to.be.equal("Explain the difference between `=` and `:=`Explain the difference between `=` and `:=`");
        const revertButton = await view.findWebElement(By.css("#revert-0"));
        await revertButton.click();
    });

    it.skip('Copies part of the question when text is highlighted', async () => {
        // Trouble highlighting only part of the text
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        // Find question text and highlight an area
        var question = await tds[2].findElement(By.id('question-0'));
        await question.sendKeys(Key.CONTROL, Key.SHIFT, Key.ARROW_LEFT, Key.NULL);

        // Click the copy button
        const copyButton = await view.findWebElement(By.css("#copy-0"));
        await copyButton.click();

        await question.sendKeys(Key.ARROW_RIGHT, Key.ARROW_RIGHT, Key.NULL);

        var operatingSystem = getOperatingSystem();
        if (operatingSystem == "macOS") {
            console.log("macOS");
            await question.sendKeys(Key.COMMAND, "v", Key.NULL);
        } else if (operatingSystem == "Linux") {
            console.log("Linux");
            await question.sendKeys(Key.CONTROL, "v", Key.NULL);
        } else {
            console.log("Windows");
            await question.sendKeys(Key.CONTROL, "v", Key.NULL);
        }
        console.log(await question.getAttribute("value"));

        expect(await question.getAttribute("value")).to.be.equal("Explain the difference between `=` and `:=``:=`");
        const revertButton = await view.findWebElement(By.css("#revert-0"));
        await revertButton.click();
    });

    it('notifies of API key error', async() => {
        //Click intercepted error
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        const driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#suggestAI-0')));
        //const aiButton = await tds[3].findElement(By.id("suggestAI-0"));
        const aiButton = await view.findWebElement(By.id("suggestAI-0"));
        //Comment might be better?
        await aiButton.click();

        await driver.wait(until.elementLocated(By.css('#ai-0')));
        var aiBox = await tds[2].findElement(By.id('ai-0'));

        console.log(await aiBox.getAttribute('value'));
        expect(await aiBox.getAttribute('value')).to.be.not.equal('');
    })

    it('suggests a question using AI', async() => {
        //Click intercepted error
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        const driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#ai-0')));
        var aiBox = await tds[2].findElement(By.id('ai-0'));
        
        await driver.wait(until.elementLocated(By.css('#suggestAI-0')));
        //const suggestButton = await tds[3].findElement(By.id("suggestAI-0"));
        const suggestButton = await view.findWebElement(By.id("suggestAI-0"));
        await suggestButton.click();

        expect(await aiBox.getAttribute("value")).to.be.not.equal("");
    })

    it('rephrases a question using AI', async() => {
        //Click intercepted error
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        const driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#ai-0')));
        var aiBox = await tds[2].findElement(By.id('ai-0'));

        await driver.wait(until.elementLocated(By.css('#rephraseAI-0')));
        //const rephraseAI = await tds[3].findElement(By.id("rephraseAI-0"));
        const rephraseAI = await view.findWebElement(By.id("rephraseAI-0"));
        await rephraseAI.click();

        expect(await aiBox.getAttribute("value")).to.be.not.equal("");
    })

    it('accepts AI output', async () => {
        //Click intercepted error
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));
        
        const driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#ai-0')));
        var aiBox = await tds[2].findElement(By.id('ai-0'));

        await driver.wait(until.elementLocated(By.css('#question-0')));
        var question = await tds[2].findElement(By.id('question-0'));

        await driver.wait(until.elementLocated(By.css('#acceptAI-0')));
        //const acceptAI = await tds[3].findElement(By.id("acceptAI-0"));
        const acceptAI = await view.findWebElement(By.id("acceptAI-0"));
        const suggestAI = await view.findWebElement(By.id("suggestAI-0"));
        const rephraseAI = await view.findWebElement(By.id("rephraseAI-0"));
        const exclude = await view.findWebElement(By.id("exclude-0"));
        const label = await view.findWebElement(By.css("[for='exclude-0']"));
        var i = 0;
        while (i < 10) {
            console.log("Loop %d: \n", i);
            const acceptAI = await view.findWebElement(By.id("acceptAI-0"));
            const acceptRect = await acceptAI.getRect();
            const suggestAI = await view.findWebElement(By.id("suggestAI-0"));
            const suggestRect = await suggestAI.getRect();
            const rephraseAI = await view.findWebElement(By.id("rephraseAI-0"));
            const rephraseRect = await rephraseAI.getRect();
            const exclude = await view.findWebElement(By.id("exclude-0"));
            const excludeRect = await exclude.getRect();
            const label = await view.findWebElement(By.css("[for='exclude-0']"));
            const labelRect = await label.getRect();
            if (!overlap(acceptRect, suggestRect)) {
                break;
            }
            else if (!overlap(acceptRect, rephraseRect)) {
                break;
            }
            else if (!overlap(acceptRect, excludeRect)) {
                break;
            }
            else if (!overlap(acceptRect, labelRect)) {
                break;
            }
            await pause(1000); //1 second wait
            i += 1;
        }
        console.log('found');

        await acceptAI.click();
        console.log('accepted');

        expect(await question.getAttribute("value")).to.be.equal(await aiBox.getAttribute("value"));
        await driver.wait(until.elementLocated(By.css('#revert-0')));
        //const revertButton = await tds[3].findElement(By.id("revert-0"));
        const revertButton = await view.findWebElement(By.id("revert-0"));
        console.log('found');
        await revertButton.click();
        console.log('reverted');
    })

    it('Excludes a question when the "Exclude Question" box is checked', async () => {
        //Click intercepted error
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        const driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#exclude-0')));
        //var checkbox = await tds[3].findElement(By.id('exclude-0'));
        var checkbox = await view.findWebElement(By.id('exclude-0'));
        console.log("found");
        var label = await view.findWebElement(By.css("[for='exclude-0']"));
        console.log("found label");

        const acceptAI = await view.findWebElement(By.id("acceptAI-0"));
        const suggestAI = await view.findWebElement(By.id("suggestAI-0"));
        const rephraseAI = await view.findWebElement(By.id("rephraseAI-0"));
        var i = 0;
        while (i < 10) {
            console.log("Loop %d: \n", i);
            var checkbox = await view.findWebElement(By.id('exclude-0'));
            var label = await view.findWebElement(By.css("[for='exclude-0']"));

            const acceptAI = await view.findWebElement(By.id("acceptAI-0"));
            const acceptRect = await acceptAI.getRect();
            const suggestAI = await view.findWebElement(By.id("suggestAI-0"));
            const suggestRect = await suggestAI.getRect();
            const rephraseAI = await view.findWebElement(By.id("rephraseAI-0"));
            const rephraseRect = await rephraseAI.getRect();
            const checkboxRect = await checkbox.getRect();
            const labelRect = await label.getRect();
            if (!overlap(checkboxRect, acceptRect)) {
                break;
            }
            else if (!overlap(checkboxRect, suggestRect)) {
                break;
            }
            else if (!overlap(checkboxRect, rephraseRect)) {
                break;
            }
            else if (!overlap(checkboxRect, labelRect)) {
                break;
            }
            await pause(1000); //1 second wait
            i += 1;
        }
        console.log('found');

        // Originally not excluded
        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal(false);
        
        // Should be excluded
        expect(await checkbox.isEnabled()).to.be.true;
        //await checkbox.click();
        await pause(1000); // 1 sec pause
        await label.click();
        console.log("Clicked");

        await driver.wait(until.elementLocated(By.css('#exclude-0')));
        var checkbox = await view.findWebElement(By.id('exclude-0'));
        console.log("found");

        var label = await view.findWebElement(By.css("[for='exclude-0']"));
        console.log('found label');
        console.log(await label.getAttribute("value"));

        expect(await checkbox.isDisplayed()).to.be.true;
        expect(await checkbox.isSelected()).to.equal(true);

        // Unexclude it
        await driver.wait(until.elementLocated(By.css('#exclude-0')));
        //await checkbox.click();
        await pause(1000); // 1 sec pause
        await label.click();
        console.log("Clicked");

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

    it('Refreshes the page', async () => {
        var driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#refreshBtn')));
        const refreshBtn = await view.findWebElement(By.css('#refreshBtn'));
        console.log("refreshBtn found");

        var windows = await driver.getAllWindowHandles();
        var currWindow = await driver.getWindowHandle();

        console.log(windows);
        console.log(currWindow);
        console.log("Index of currWindow before click: ", windows.indexOf(currWindow));
        
        expect(await refreshBtn.isDisplayed()).to.be.true;
        var driver = VSBrowser.instance.driver;
        await refreshBtn.click();
        
        view = new WebView();
        await view.switchToFrame();

        var windows = await driver.getAllWindowHandles();
        var currWindow = await driver.getWindowHandle();

        console.log(windows);
        console.log(currWindow);
        console.log("Index of currWindow after click: ", windows.indexOf(currWindow));

        // Check the title and number of questions.
        console.log('1');
        await driver.wait(until.elementLocated(By.css('h1')), 15_000);
        const element = await view.findWebElement(By.css('h1'));
        console.log('2');
        expect(await element.getText()).has.string('All Quiz Questions');
        console.log('3');
        const element2 = await view.findWebElement(By.css('.total-count'));
        console.log('4');
        expect(await element2.getText()).to.have.string(`Total Questions: 14`);
        console.log('5');

        var expectedNew = `                while line := file.readline():
                    socket.send_text_line(line)`;

        await driver.wait(until.elementLocated(By.css('#refreshBtn')), 15_000);
        console.log('6');
        await verifyQuestionDisplayed(view, {
            rowIndex: 0,
            rowLabel: '1a',
            color: ViewColors.GREEN,
            file: 'antonio/my_http_server.py',
            code: expectedNew,
            question: "Explain the difference between `=` and `:=`",
        });
        console.log('7');
    });

    it.skip('opens the link correctly when clicked', async () => {
        var tbody = await view.findWebElement(By.id('questionsTableBody'));
        var trow = await tbody.findElement(By.id('row-0'));
        var tds = await trow.findElements(By.css('td'));

        var driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#filepath-0')));
        var filePath = await tds[1].findElement(By.css('#filepath-0'));
        await filePath.click();
        
        await driver.close();
        driver = VSBrowser.instance.driver;
        driver.switchTo().defaultContent();

        await driver.wait(until.elementLocated(By.css('#refreshBtn')));

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

        const driver = VSBrowser.instance.driver;
        await driver.wait(until.elementLocated(By.css('#delete-0')));
        var deleteButton = await tds[3].findElement(By.css('#delete-0'));
        expect(await deleteButton.isDisplayed()).to.be.true;

        //Need to find a way to correctly undo the delete after it's clicked
        await deleteButton.click();
        await driver.wait(until.elementLocated(By.css('#delete-0')));

        await verifyQuestionCount(13);
        ({view, summaryContainer} = await setUpQuizQuestionWebView('cis371_server', '13'));
        
        await driver.wait(until.elementLocated(By.css('#delete-0')));
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

    function overlap(rect1: IRectangle, rect2: IRectangle) {
        if (rect1.x + rect1.width < rect2.x || rect2.x + rect2.width < rect1.x) {
            console.log(`${rect1.x} + ${rect1.width} < ${rect2.x} || ${rect2.x} + ${rect2.width} < ${rect1.x}`);
            return true
        }
        if (rect1.y + rect1.height < rect2.y || rect2.y + rect2.height < rect1.y) {
            console.log(`${rect1.y} + ${rect1.height} < ${rect2.y} || ${rect2.y} + ${rect2.height} < ${rect1.y}`);
            return true
        }
        console.log("No overlap");
        return false
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
