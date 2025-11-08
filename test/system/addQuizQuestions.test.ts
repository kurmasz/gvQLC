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
  TextEditor,
} from "vscode-extension-tester";
import { By, until, Key } from "selenium-webdriver";
import {
  pause,
  logAllNotifications,
  waitForNotification,
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
    await openWorkspace("cis371_server_empty");
    await new Workbench().executeCommand("gvQLC: Add Quiz Question");
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
    await new Workbench().executeCommand("gvQLC: Add Quiz Question");
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
    await new Workbench().executeCommand("gvQLC: Add Quiz Question");

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
    await new Workbench().executeCommand("gvQLC: Add Quiz Question");
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

  it("Copies the full code segment when no text is highlighted", async () => {
    const questionBox = await view.findWebElement(By.css("#question"));
    await questionBox.clear();

    const copyButton = await view.findWebElement(By.css("#copyButton"));
    await copyButton.click();

    expect(await questionBox.getAttribute("value")).to.be.equal('~~~\n".html": handle_binary\n~~~');
  });

  it("Copies part of the code segment when part of the code is highlighted", async () => {
    // Trouble highlighting only part of the code
    const questionBox = await view.findWebElement(By.css("#question"));
    await questionBox.sendKeys(Key.CONTROL, Key.SHIFT, Key.ARROW_LEFT, Key.NULL);
    
    const copyButton = await view.findWebElement(By.css("#copyButton"));
    await copyButton.click();
    console.log(await questionBox.getAttribute("value"));

    expect(await questionBox.getAttribute("value")).to.be.equal('~~~\nhandle_binary\n~~~');
  });

  it('notifies of API key error', async() => {
    const aiBox = await view.findWebElement(By.css("#aiOutput"));
    await aiBox.clear();
    expect(await aiBox.getAttribute('value')).to.be.equal('');

    const aiButton = await view.findWebElement(By.css("#aiButton"));
    await aiButton.click();
    // Need to delay further operation until after we get a response

    expect(await aiBox.getAttribute('value')).to.be.equal('Error: Failed to generate question: No API key configured. Please run "gvQLC: Set LLM API Key" command first.');
  })

  it.skip('generates AI output', async () => {
    const aiBox = await view.findWebElement(By.css("#aiOutput"));
    await aiBox.clear();
    expect(await aiBox.getAttribute('value')).to.be.equal('');

    const aiButton = await view.findWebElement(By.css("#aiButton"));
    await aiButton.click();
    // Need to delay further operation until after we get a response

    expect(await aiBox.getAttribute('value')).to.be.not.equal('');
  });

  it.skip('fills in answer/question sections with AI output', async () => {
    const questionBox = await view.findWebElement(By.css("#question"));
    const answerBox = await view.findWebElement(By.css("#answer"));
    await questionBox.clear();
    await answerBox.clear();

    const acceptButton = await view.findWebElement(By.css("#acceptAI"));
    await acceptButton.click();
    // Need to delay further operation until after we get a response from the earlier button click

    expect(await questionBox.getAttribute('value')).to.be.not.equal('');
    expect(await answerBox.getAttribute('value')).to.be.not.equal('');
    questionBox.clear();
    answerBox.clear();
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

    const highContrastButton = await view.findWebElement(By.css("#highContrastButton"));
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

  it("saves the question and answer when submitted", async () => {
    const questionBox = await view.findWebElement(By.css("#question"));
    await questionBox.clear();
    await questionBox.sendKeys("This is the question.");

    const answerBox = await view.findWebElement(By.css("#answer"));
    await answerBox.clear();
    await answerBox.sendKeys("And this is the answer.");

    const submitButton = await view.findWebElement(By.css("#submitButton"));

    const questionsPath = path.join(tempWorkspaceDir, quizQuestionsFileName);
    const data = await actAndAwaitUpdate(
      questionsPath,
      async () => {
        await submitButton.click();
      },
      60_000
    );

    expect(data.length).to.equal(15);

    const newQuestion = data[14];
    expect(newQuestion.filePath).to.equal(
      path.join("sam", "my_http_server.py")
    );

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

    const questionsPath = path.join(tempWorkspaceDir, quizQuestionsFileName);
    const data = await actAndAwaitUpdate(
      questionsPath,
      async () => {
        await submitButton.click();
      },
      60_000
    );

    expect(data.length).to.equal(16);

    const newQuestion = data[15];
    expect(newQuestion.filePath).to.equal(
      path.join("sam", "my_http_server.py")
    );
    expect(newQuestion.range).to.deep.equal({
      start: { line: 75, character: 4 },
      end: { line: 75, character: 27 },
    });
    expect(newQuestion.text).to.equal("Split what?  Why?");
    expect(newQuestion.highlightedCode).to.equal("parts = request.split()");
    expect(newQuestion.answer).to.satisfy(
      (val: string | undefined) => val === undefined || val === ""
    );
    expect(newQuestion.excludeFromQuiz).to.be.false;
  });

  // Complain if question is blank
  // Make sure stuff is properly escaped.
  // Nothing saved if tab is closed.
  // What happens if question file doesn't exist yet?

  async function addQuizQuestion(textToSelect: string) {
    const driver = VSBrowser.instance.driver;
    const editor = new TextEditor();
    await editor.selectText(textToSelect);
    await new Workbench().executeCommand("gvQLC: Add Quiz Question");
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
