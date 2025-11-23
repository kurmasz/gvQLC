/************************************************************************************
 *
 * exportQuiz.test.ts
 *
 * Test the exportQuiz command.
 *
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 *
 * (C) 2025 Phuc Le
 * *********************************************************************************/

import {
  Workbench,
  WebDriver,
  WebView,
  VSBrowser,
  NotificationType,
  TextEditor,
} from "vscode-extension-tester";
import { By, until, Key } from "selenium-webdriver";
import {
  pause,
  logAllNotifications,
  waitForNotification,
  readFile,
  openFile,
  openWorkspace,
  openTempWorkspace,
  assertNumNotifications,
  dismissAllNotifications,
  actAndAwaitUpdate,
} from "../helpers/systemHelpers";
import { quizQuestionsFileName } from "../../src/sharedConstants";

import { expect } from "chai";
import * as path from "path";
import * as fs from "fs";


describe("exportQuizQuestions", function () {
  let view: WebView;
  let tempWorkspaceDir: string;

  this.timeout(150_000);

  after(async function () {
    await VSBrowser.instance.driver.switchTo().defaultContent();
  });

  //
  // No file / no selection / no previous questions
  //
  it("Notifies when a folder has no existing questions when trying to export questions", async () => {
    await openWorkspace("cis371_server_empty");
    await new Workbench().executeCommand("gvQLC: Export Quiz");
    await waitForNotification(NotificationType.Info, (message) => {
      return (
        message === "No personalized questions added yet!"
      );
    });
  });

  it("Notifies when a folder has existing questions when trying to export questions", async () => {
    await openWorkspace("cis371_server");
    view = await setupExportQuizQuestion();
  });

  //Single Page - No Answer Key

  it("Checks that a single page HTML file is created", async () => {
    await exportQuizQuestion('html', true, false);
    const allQuiz = await readFile('quiz_all_students.html');
    expect(allQuiz).to.include('</div><div class="quiz-body">');
    expect(allQuiz).to.include('<div class="quiz-question">');
    expect(allQuiz).to.include('<p class="quiz-number">');
    expect(allQuiz).to.include('<p class="quiz-text">');
    expect(allQuiz).to.include('<pre class="quiz-code">');
    expect(allQuiz).to.include('Quiz for ');
    expect(allQuiz).to.include('Due Date: ');
    expect(allQuiz).to.include('File: ');
    expect(allQuiz).to.not.include('Answer: ');
  });

  it("Checks that a single page Markdown file is created", async () => {
    await exportQuizQuestion('markdown', true, false);
    const allQuiz = await readFile('quiz_all_students.md');
    expect(allQuiz).to.include('Quiz for ');
    expect(allQuiz).to.include('Due Date: ');
    expect(allQuiz).to.include('File: ');
    expect(allQuiz).to.not.include('Answer: ');
  });

  it("Checks that a single page PDF file is created", async () => {
    // Acts oddly on Linux machines, says pdf file being tested can't be found
    await exportQuizQuestion('pdf', true, false);
    const allQuiz = await readFile('quiz_all_students.pdf');
    expect(allQuiz).to.include('Quiz for ');
    expect(allQuiz).to.include('Due Date: ');
    expect(allQuiz).to.include('File: ');
    expect(allQuiz).to.not.include('Answer: ');
  });

  //Single Page - Answer Key

  it("Checks that a single page HTML file with answer keys is created", async () => {
    await exportQuizQuestion('html', true, true);
    const allQuiz = await readFile('quiz_all_students.html');
    expect(allQuiz).to.include('</div><div class="quiz-body">');
    expect(allQuiz).to.include('<div class="quiz-question">');
    expect(allQuiz).to.include('<p class="quiz-number">');
    expect(allQuiz).to.include('<p class="quiz-text">');
    expect(allQuiz).to.include('<pre class="quiz-code">');
    expect(allQuiz).to.include('<p class="quiz-answer">');
    expect(allQuiz).to.include('Quiz for ');
    expect(allQuiz).to.include('Due Date: ');
    expect(allQuiz).to.include('File: ');
    expect(allQuiz).to.include('Answer: ');
  });

  it("Checks that a single page Markdown file with answer keys is created", async () => {
    await exportQuizQuestion('markdown', true, true);
    const allQuiz = await readFile('quiz_all_students.md');
    expect(allQuiz).to.include('Quiz for ');
    expect(allQuiz).to.include('Due Date: ');
    expect(allQuiz).to.include('File: ');
    expect(allQuiz).to.include('Answer: ');
  });

  it("Checks that a single page PDF file with answer keys is created", async () => {
    // Acts oddly on Linux machines, says pdf file being tested can't be found
    await exportQuizQuestion('pdf', true, true);
    const allQuiz = await readFile('quiz_all_students.pdf');
    expect(allQuiz).to.include('Quiz for ');
    expect(allQuiz).to.include('Due Date: ');
    expect(allQuiz).to.include('File: ');
    expect(allQuiz).to.include('Answer: ');
  });

  //Multiple Page - No Answer Key

  it("Checks that multiple HTML files are created", async () => {
    await exportQuizQuestion('html', false, false);
    const antonioQuiz = await readFile('quiz_antonio.html');
    expect(antonioQuiz).to.include('<div class="quiz-body">');
    expect(antonioQuiz).to.include('<div class="quiz-question">');
    expect(antonioQuiz).to.include('<p class="quiz-number">');
    expect(antonioQuiz).to.include('<p class="quiz-text">');
    expect(antonioQuiz).to.include('<pre class="quiz-code">');
    expect(antonioQuiz).to.not.include('<p class="quiz-answer">');
    expect(antonioQuiz).to.include('Quiz for antonio');
    expect(antonioQuiz).to.include('Due Date: ');
    expect(antonioQuiz).to.include('File: ');
    console.log(antonioQuiz.includes("Answer: "));
    expect(antonioQuiz).to.not.include('Answer: ');
  });

  it("Checks that multiple Markdown files are created", async () => {
    await exportQuizQuestion('markdown', false, false);
    const antonioQuiz = await readFile('quiz_antonio.md');
    expect(antonioQuiz).to.include('Quiz for antonio');
    expect(antonioQuiz).to.include('Due Date: ');
    expect(antonioQuiz).to.include('File: ');
    expect(antonioQuiz).to.not.include('Answer: ');
  });

  it("Checks that multiple PDF files are created", async () => {
    // Acts oddly on Linux machines, says pdf file being tested can't be found
    await exportQuizQuestion('pdf', false, false);
    const antonioQuiz = await readFile('quiz_antonio.pdf');
    expect(antonioQuiz).to.include('Quiz for antonio');
    expect(antonioQuiz).to.include('Due Date: ');
    expect(antonioQuiz).to.include('File: ');
    expect(antonioQuiz).to.not.include('Answer: ');
  });

  //Multiple Page - Answer Key

  it("Checks that multiple HTML files with answer keys are created", async () => {
    await exportQuizQuestion('html', false, true);
    const antonioQuiz = await readFile('quiz_antonio.html');
    expect(antonioQuiz).to.include('</div><div class="quiz-body">');
    expect(antonioQuiz).to.include('<div class="quiz-question">');
    expect(antonioQuiz).to.include('<p class="quiz-number">');
    expect(antonioQuiz).to.include('<p class="quiz-text">');
    expect(antonioQuiz).to.include('<pre class="quiz-code">');
    expect(antonioQuiz).to.include('<p class="quiz-answer">');
    expect(antonioQuiz).to.include('Quiz for antonio');
    expect(antonioQuiz).to.include('Due Date: ');
    expect(antonioQuiz).to.include('File: ');
    expect(antonioQuiz).to.include('Answer: ');
    
  });

  it("Checks that multiple Markdown files with answer keys are created", async () => {
    await exportQuizQuestion('markdown', false, true);
    const antonioQuiz = await readFile('quiz_antonio.md');
    expect(antonioQuiz).to.include('Quiz for antonio');
    expect(antonioQuiz).to.include('Due Date: ');
    expect(antonioQuiz).to.include('File: ');
    expect(antonioQuiz).to.include('Answer: ');
  });

  it("Checks that multiple PDF files with answer keys are created", async () => {
    // Acts oddly on Linux machines, says pdf file being tested can't be found
    await exportQuizQuestion('pdf', false, true);
    const antonioQuiz = await readFile('quiz_antonio.pdf');
    expect(antonioQuiz).to.include('Quiz for antonio');
    expect(antonioQuiz).to.include('Due Date: ');
    expect(antonioQuiz).to.include('File: ');
    expect(antonioQuiz).to.include('Answer: ');
  });
  

  async function setupExportQuizQuestion() {
    const driver = VSBrowser.instance.driver;
    await new Workbench().executeCommand("gvQLC: Export Quiz");
    await new Promise((res) => setTimeout(res, 1000));

    const tab = await driver.wait(
      until.elementLocated(By.css('[aria-label="Export Menu"]')),
      15_000
    );
    await driver.wait(until.elementIsVisible(tab), 5_000);

    // Switch to the frame containing the new view
    const view = new WebView();
    await view.switchToFrame();

    // Check the title and number of questions.
    await driver.wait(until.elementLocated(By.id("exportBtn")));
    const element = await view.findWebElement(By.id("exportBtn"));
    expect(await element.getText()).has.string("Export Quiz");

    return view;
  }

  async function exportQuizQuestion(format: string, singlePage: boolean, includeAnswers: boolean) {
    if (!(['html', 'pdf', 'markdown'].includes(format))) {
      console.log("Expected format = 'html', 'pdf', 'markdown'");
      return;
    }
    const formatSelect = await view.findWebElement(By.id(`${format}Type`));
    if ((await formatSelect.isSelected()) === false) {
      await formatSelect.click();
    }

    const pageSelect = await view.findWebElement(By.id('singlePage'));
    if ((await pageSelect.isSelected()) === false && singlePage === true) {
      await pageSelect.click();
    }
    else if ((await pageSelect.isSelected()) === true && singlePage === false) {
      await pageSelect.click();
    }

    const answerSelect = await view.findWebElement(By.id('includeAnswers'));
    if ((await answerSelect.isSelected()) === false && includeAnswers === true) {
      await answerSelect.click();
    }
    else if ((await answerSelect.isSelected()) === true && includeAnswers === false) {
      await answerSelect.click();
    }
    
    const exportBtn = await view.findWebElement(By.id("exportBtn"));
    await exportBtn.click();
    await pause(5000);
  }
});
