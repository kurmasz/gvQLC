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
import { By, until, WebElement } from 'selenium-webdriver';
import { verifyQuestionDisplayed, verifySummaryDisplayed, setUpQuizQuestionWebView } from '../helpers/questionViewHelpers';
import {ViewColors} from '../../src/sharedConstants';

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
            ({ view, summaryContainer } = await setUpQuizQuestionWebView(driver, folder, '12'));
        });

        it('displays correct rows when searching for "if"', async () => {
            // searches both Highlighted code and Question



        });
    });