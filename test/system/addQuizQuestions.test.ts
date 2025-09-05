/************************************************************************************
 *
 * addQuizQuestions.test.ts
 *
 * Test the addQuizQuestions command.
 *
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 *
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import {
  Workbench,
  WebDriver,
  WebView,
  VSBrowser,
  NotificationType,
  TextEditor
} from "vscode-extension-tester";
import { By, until } from "selenium-webdriver";
import {
  pause,
  logAllNotifications,
  waitForNotification,
  openFile,
  openWorkspace,
  openTempWorkspace,
  assertNumNotifications,
  dismissAllNotifications,
} from "../helpers/systemHelpers";
import { quizQuestionsFileName } from "../../src/sharedConstants";

import { expect } from "chai";
import * as path from "path";
import * as fs from "fs";

describe("addQuizQuestions", function () {
  let view: WebView;
  let tempWorkspaceDir: string;

  this.timeout(150_000);

  after(async function () {
    await VSBrowser.instance.driver.switchTo().defaultContent();
  });

  //
  // No file / no selection / no previous questions
  //
  it("Notifies when no file is open in project without existing questions", async () => {
    await openWorkspace("cis371_server_empty")
    await (new Workbench()).executeCommand("gvQLC: Add Quiz Question");
    await waitForNotification(NotificationType.Error, (message) => {
      return (
        message ===
        "gvQLC: No active editor tab found. (You must have a code snippet selected to add a quiz question.)"
      );
    });
  });

  it("Notifies when no text is selected in open file in project without existing questions", async () => {
    // Open a file
    await openFile("cooper/http_socket.py");
    await (new Workbench()).executeCommand("gvQLC: Add Quiz Question");
    await waitForNotification(
      NotificationType.Error,
      (message) =>
        message ===
        "gvQLC: No code selected. (You must have a code snippet selected to add a quiz question.)"
    );
  });

  //
  // No file / no selection / with previous questions
  //
  it("Notifies when no file is open in project with existing questions", async () => {
    await openWorkspace("cis371_server");
    await (new Workbench()).executeCommand("gvQLC: Add Quiz Question");

    await waitForNotification(NotificationType.Error, (message) => {
      return (
        message ===
        "gvQLC: No active editor tab found. (You must have a code snippet selected to add a quiz question.)"
      );
    });
  });

  it("Notifies when no text is selected in open file in project with existing questions", async () => {
    // Open a file
    await openFile("cooper/http_socket.py");
    await (new Workbench()).executeCommand("gvQLC: Add Quiz Question");
    await waitForNotification(
      NotificationType.Error,
      (message) =>
        message ===
        "gvQLC: No code selected. (You must have a code snippet selected to add a quiz question.)"
    );
  });

  //
  // Add to existing questions
  //
  it("Copies selected text when initiating new quiz question", async () => {
    tempWorkspaceDir = await openTempWorkspace("cis371_server");
    await new Promise((res) => setTimeout(res, 5000)); // crude but useful
    await openFile("sam/my_http_server.py");
    await dismissAllNotifications();

    view = await addQuizQuestion('".html": handle_binary');
  });

  it("saves the question and answer when submitted", async () => {
    const questionBox = await view.findWebElement(By.css("#question"));
    await questionBox.clear();
    await questionBox.sendKeys("This is the question.");

    const answerBox = await view.findWebElement(By.css("#answer"));
    await answerBox.clear();
    await answerBox.sendKeys("And this is the answer.");

    const submitButton = await view.findWebElement(By.css("#submitButton"));
    await submitButton.click();

    await new Promise((res) => setTimeout(res, 5000));

    const questionsPath = path.join(tempWorkspaceDir, quizQuestionsFileName);
    const fileContent = await fs.promises.readFile(questionsPath, "utf-8");
    const data = JSON.parse(fileContent.toString());
    expect(data.length).to.equal(15);

    const newQuestion = data[14];
    expect(newQuestion.filePath).to.equal("sam/my_http_server.py");
    expect(newQuestion.range).to.deep.equal({
      start: { line: 29, character: 4 },
      end: { line: 29, character: 26 },
    });
    expect(newQuestion.text).to.equal("This is the question.");
    expect(newQuestion.highlightedCode).to.equal('".html": handle_binary');
    expect(newQuestion.answer).to.equal("And this is the answer.");
    expect(newQuestion.excludeFromQuiz).to.be.false;
  });

  it("Generates exactly one info notification upon success", async () => {
    await VSBrowser.instance.driver.switchTo().defaultContent();
    await waitForNotification(
      NotificationType.Info,
      (message) => message === "Question added successfully."
    );
    await assertNumNotifications(1);
  });

  it("Allows an answer to be blank", async () => {
    await dismissAllNotifications();
    view = await addQuizQuestion("parts = request.split()");

    const questionBox = await view.findWebElement(By.css("#question"));
    await questionBox.clear();
    await questionBox.sendKeys("Split what?  Why?");

    const submitButton = await view.findWebElement(By.css("#submitButton"));
    await submitButton.click();

    pause(5000);

    const questionsPath = path.join(tempWorkspaceDir, quizQuestionsFileName);
    const fileContent = await fs.promises.readFile(questionsPath, "utf-8");
    const data = JSON.parse(fileContent.toString());
    expect(data.length).to.equal(16);

    const newQuestion = data[15];
    expect(newQuestion.filePath).to.equal("sam/my_http_server.py");
    expect(newQuestion.range).to.deep.equal({
      start: { line: 75, character: 4 },
      end: { line: 75, character: 27 },
    });
    expect(newQuestion.text).to.equal("Split what?  Why?");
    expect(newQuestion.highlightedCode).to.equal("parts = request.split()");
    expect(newQuestion.answer).to.satisfy((val : string | undefined) => val === undefined || val === "");
    expect(newQuestion.excludeFromQuiz).to.be.false;
  });

  // Complain if question is blank
  // Make sure stuff is properly escaped.
  // Nothing saved if tab is closed.
  // What happens if question file doesn't exist yet?

  async function addQuizQuestion(textToSelect: string
  ) {
    const driver = VSBrowser.instance.driver;
    const editor = new TextEditor();
    await editor.selectText(textToSelect);
    await (new Workbench()).executeCommand("gvQLC: Add Quiz Question");
    await new Promise((res) => setTimeout(res, 1000));

    const tab = await driver.wait(
      until.elementLocated(By.css('[aria-label="Add Quiz Question"]')),
      15_000
    );
    await driver.wait(until.elementIsVisible(tab), 5_000);

    // Switch to the frame containing the new view
    const view = new WebView();
    await view.switchToFrame();

    // Check the title and number of questions.
    await driver.wait(until.elementLocated(By.id("addQuizQuestionTitle")));
    const element = await view.findWebElement(By.id("addQuizQuestionTitle"));
    expect(await element.getText()).has.string("Add a Quiz Question");
    const element2 = await view.findWebElement(By.id("codeBlock"));
    expect(await element2.getText()).to.equal(textToSelect);

    return view;
  }
});
