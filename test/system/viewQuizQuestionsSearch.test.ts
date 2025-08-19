/************************************************************************************
 * 
 * viewQuizQuestionsSearch.test.ts
 * 
 * Test the search aspect of the viewQuizQuestions command.
 * 
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import { WebDriver, WebView, VSBrowser } from 'vscode-extension-tester';
import { By, until, WebElement, Key } from 'selenium-webdriver';
import { verifyQuestionDisplayed, verifyVisibility, verifySummaryDisplayed, setUpQuizQuestionWebView } from '../helpers/questionViewHelpers';
import { ViewColors } from '../../src/sharedConstants';

import { expect } from 'chai';
import * as path from 'path';

describe('viewQuizQuestions search', function () {
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

    it('searches multiple columns and displays rows correctly.', async () => {
        await searchFor('2');
        await verifyFilterCount(7);

        // example match by question label
        await verifyQuestionDisplayed(view, {
            rowIndex: 2,
            rowLabel: '2a',
            color: ViewColors.GREEN,
            file: 'awesome/my_http_server.py',
            code: "        list_directory += f'<li><a href=\"{file}\">{file}</a></li>'",
            question: "Why is `file` listed twice?",
        });

        // example match by file
        const expected_3a = `        if not path.endswith('/'):
            # Define the redirect path by adding a '/' at the end of the path
            redirect_path = path + '/'
            socket.send_text_line("HTTP/1.0 301 Moved Permanently") # 301 is the correct call for a redirect
            socket.send_text_line(f"Location: {redirect_path}") # Redirect path
            socket.send_text_line(f"Content-Length: 0")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")
            socket.close()
            return`;


        await verifyQuestionDisplayed(view, {
            rowIndex: 4,
            rowLabel: '3a',
            color: ViewColors.YELLOW,
            file: 'caleb2/my_http_server.py',
            code: expected_3a,
            question: "What is the blank line for?",
        });

        // example code 
        const expected_7a = `        if path.endswith((".jpeg", ".jpg", ".png", ".gif", ".ico", ".pdf")):
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
            rowIndex: 11,
            rowLabel: '7a',
            color: ViewColors.YELLOW,
            file: 'neptune_man/my_http_server.py',
            code: expected_7a,
            question: "How would read mode ever be anything but `rb`?",
        });

        // example question
        const expected_8a = `        path = parts[1][1:]  # remove the first character of the path`;
        await verifyQuestionDisplayed(view, {
            rowIndex: 12,
            rowLabel: '8a',
            color: ViewColors.GREEN,
            file: 'uncle_bob/my_http_server.py',
            code: expected_8a,
            question: "What does the `[1:]` mean? Why not `[2:]`?",
        });

    });

    // Question search
    it('searches the question', async () => {
        await searchFor('need');
        await verifyFilterCount(1);

        const expected = `    if path[-1] != '/':
        path += '/'`;

        await verifyQuestionDisplayed(view, {
            rowIndex: 1,
            rowLabel: '1b',
            color: ViewColors.GREEN,
            file: 'antonio/my_http_server.py',
            code: expected,
            question: "Why do we need to add '/'?",
        });

        const visibility = allHidden();
        visibility['1b'] = true;

        verifyVisibility(view, visibility);
    });

    async function searchFor(term: string) {
        const searchBox = await driver.findElement(By.id("searchInput"));
        await searchBox.clear();
        await searchBox.sendKeys(term);
        await searchBox.sendKeys(Key.RETURN);
    }

    async function verifyFilterCount(expectedCount: number) {
        const element = await view.findWebElement(By.css('#filterCount'));
        expect(await element.getText()).to.equal(`${expectedCount} matches`);
    }

    function allVisible() {
        const questions = {
            '1a': true,
            '1b': true,
            '2a': true,
            '2b': true,
            '3a': true,
            '4a': true,
            '4b': true,
            '5a': true,
            '6a': true,
            '6b': true,
            '6c': true,
            '7a': true,
            '8a': true,
            '8b': true
        };
        return { ...questions };
    }

    function allHidden() {
        return Object.fromEntries(
            Object.keys(allVisible()).map(key => [key, false])
        );
    }
});

