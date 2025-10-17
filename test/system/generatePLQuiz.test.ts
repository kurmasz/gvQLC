/************************************************************************************
 *
 * generatePLQuiz.test.ts
 *
 * Test the generatePLQuiz command.
 *
 * IMPORTANT: Remember: VSCode and the extension are _not_ re-set between tests.
 * these tests must run in order.
 *
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

import { WebView, NotificationType, Workbench } from "vscode-extension-tester";
import { WebElement } from "selenium-webdriver";
import {
  openWorkspace,
  openTempWorkspace,
  makeTempCopy,
  waitForNotification,
  dismissAllNotifications,
  fixturePath,
} from "../helpers/systemHelpers";

import {
  setPLRoot,
  verifyDirectoryContents,
  verifyExactDirectoryContents,
} from "../helpers/plHelpers";

import { configFileName } from "../../src/sharedConstants";

import * as path from "path";
import * as fs from "fs";

import { expect } from "chai";

describe("generatePLQuiz.test.ts", function () {
  const GENERATE_PL_QUIZ_COMMAND = "gvQLC: Generate PrairieLearn Quiz";
  let view: WebView;
  let summaryContainer: WebElement;

  this.timeout(150_000);

  /////////////////////////
  //
  // Folder with no data
  //
  /////////////////////////

  it("notifies when a folder has no gvQLC data but does not create config", async () => {
    // Note: Combining the test for the notification with the "no create" tests
    // helps avoid false positivies by using the appearance of the notification
    // as verification that the command is complete.

    const workspaceName = "cis371_server_empty";

    // Make sure the fixture didn't get messed up.
    const configPath = path.join(fixturePath(workspaceName), configFileName);
    expect(fs.existsSync(configPath)).to.be.false;

    await openWorkspace(workspaceName);
    await dismissAllNotifications();
    await new Workbench().executeCommand(GENERATE_PL_QUIZ_COMMAND);

    await waitForNotification(
      NotificationType.Error,
      (message) =>
        message === "No personalized questions available to generate the quiz!"
    );

    // Verify that no config file was created.
    expect(fs.existsSync(configPath)).to.be.false;
  });

  /////////////////////////
  //
  // Folder with no config
  //
  /////////////////////////
  it("creates a config file when necessary and notifies", async () => {
    // Note: Combining the test for config creation with the test for notification
    // helps avoid false negatives by using the appearance of the notification
    // as verification that the command is complete.

    const workspaceName = "cis371_server_no_config";
    const tempWorkspaceDir = await openTempWorkspace(workspaceName);

    // Make sure the fixture didn't get messed up.
    const configPath = path.join(tempWorkspaceDir, configFileName);
    expect(fs.existsSync(configPath)).to.be.false;

    await new Workbench().executeCommand(GENERATE_PL_QUIZ_COMMAND);

    await waitForNotification(
      NotificationType.Info,
      (message) => message === `Config file created: ${configPath}`,
      14_000
    );

    await waitForNotification(
      NotificationType.Error,
      (message) => message === "Config file has not been customized."
    );
    expect(fs.existsSync(configPath), `Config ${configPath} should exist now.`)
      .to.be.true;
  });

  it("uses the config data when generating a custom quiz and generates a success notification", async () => {
    // Note: Combining the test for the notification with the "no create" tests
    // helps avoid false positivies by using the appearance of the notification
    // as verification that the command is complete.

    const workspaceName = "cis371_server_generate_pl_quiz";
    const tempPLDir = await makeTempCopy("pl-no-quizzes");
    const tempWorkspaceDir = await openTempWorkspace(workspaceName);
    setPLRoot(path.join(tempWorkspaceDir, configFileName), tempPLDir);

    await new Workbench().executeCommand(GENERATE_PL_QUIZ_COMMAND);

    await waitForNotification(
      NotificationType.Info,
      (message) => message === "Successfully generated PrairieLearn Quiz."
    );

    // Verify that the question folder for the quiz was created and contains a folder
    // for each student that has a question. (Not all students have questions.)
    // There should also be an instructor folder.
    verifyDirectoryContents(
      [tempPLDir, "questions", "gvQLCQuiz", "regression1"],
      [
        "antonio",
        "awesome",
        "caleb2",
        "cooper",
        "george",
        "instructor",
        "jim",
        "neptune_man",
        "uncle_bob",
      ],
      ["larry", "sam", "taylor", "team_1", "team_name"]
    );

    // Verify student directories have one directory per question
    verifyExactDirectoryContents(
      [tempPLDir, "questions", "gvQLCQuiz", "regression1", "awesome"],
      ["question1", "question2"]
    );
    verifyExactDirectoryContents(
      [tempPLDir, "questions", "gvQLCQuiz", "regression1", "jim"],
      ["question1", "question2", "question3"]
    );
    verifyExactDirectoryContents(
      [tempPLDir, "questions", "gvQLCQuiz", "regression1", "neptune_man"],
      ["question1"]
    );
    verifyExactDirectoryContents(
      [tempPLDir, "questions", "gvQLCQuiz", "regression1", "instructor"],
      ["combined_questions"]
    );

    // Verify content of question directories
    verifyExactDirectoryContents(
      [
        tempPLDir,
        "questions",
        "gvQLCQuiz",
        "regression1",
        "awesome",
        "question1",
      ],
      ["info.json", "question.html"]
    );
    verifyExactDirectoryContents(
      [
        tempPLDir,
        "questions",
        "gvQLCQuiz",
        "regression1",
        "awesome",
        "question2",
      ],
      ["info.json", "question.html"]
    );
    verifyExactDirectoryContents(
      [tempPLDir, "questions", "gvQLCQuiz", "regression1", "jim", "question3"],
      ["info.json", "question.html"]
    );
    verifyExactDirectoryContents(
      [
        tempPLDir,
        "questions",
        "gvQLCQuiz",
        "regression1",
        "instructor",
        "combined_questions",
      ],
      ["info.json", "question.html"]
    );

    // Verify that the assessments folder was created and contains a folder for each
    // student that has questions, plus an "instructor" assessment
    verifyDirectoryContents(
      [tempPLDir, "courseInstances", "SectionA", "assessments", "regression1"],
      [
        "antonio",
        "awesome",
        "caleb2",
        "cooper",
        "george",
        "instructor",
        "jim",
        "neptune_man",
        "uncle_bob",
      ],
      ["larry", "sam", "taylor", "team_1", "team_name"]
    );

    // Verify that the student assessment directory contains `infoAssessment.json`
    // Just test a couple.  There is no good reason for any directory to be missing infoAssessment.json
    for (const item of ["antonio", "caleb2", "jim", "uncle_bob"]) {
      verifyExactDirectoryContents(
        [
          tempPLDir,
          "courseInstances",
          "SectionA",
          "assessments",
          "regression1",
          item,
        ],
        ["infoAssessment.json"]
      );
    }
    verifyExactDirectoryContents(
      [
        tempPLDir,
        "courseInstances",
        "SectionA",
        "assessments",
        "regression1",
        "instructor",
      ],
      ["infoAssessment.json"]
    );

    //
    // Verify contents of infoAssessment.json
    //
    for (const [userId, numQuestions] of [
      ["caleb2", 1],
      ["jim", 3],
      ["uncle_bob", 2],
    ] as [string, number][]) {
      const pathName1 = path.join(
        tempPLDir,
        "courseInstances",
        "SectionA",
        "assessments",
        "regression1",
        userId,
        "infoAssessment.json"
      );
      verifyInfoAssessment(pathName1, userId, numQuestions);
    }
    //
    // Verify contents of info.json
    //
    const prefix = path.join(
      tempPLDir,
      "questions",
      "gvQLCQuiz",
      "regression1",
      "jim"
    );
    for (const num of ["1", "2", "3"]) {
      const pathName2 = path.join(prefix, `question${num}`, "info.json");
      verifyQuestionInfo(pathName2, num);
    }
  });

  function verifyInfoAssessment(
    fileName: string,
    studentId: string,
    numQuestions: number
  ) {
    const data = JSON.parse(fs.readFileSync(fileName, "utf8"));
    expect(data.uuid).to.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(data.type).to.equal("Exam");
    expect(data.title).to.equal("Regression Quiz 1");
    expect(data.set).to.equal("QA Quizzes");
    expect(data.number).to.equal("1");

    const examAccess = data.allowAccess[0];
    expect(examAccess.mode).to.equal("Public");
    expect(examAccess.uids).to.deep.equal([studentId]);
    expect(examAccess.credit).to.equal(100);
    expect(examAccess.timeLimitMin).to.equal(45);
    expect(examAccess.startDate).to.equal("2025-04-19T10:30:00");
    expect(examAccess.endDate).to.equal("2025-04-19T16:30:40");
    expect(examAccess.password).to.equal("luggage1234");
    expect(
      examAccess.active === true || !("active" in examAccess),
      "examAccess.active should be true or missing"
    ).to.be.true;

    const feedbackAccess = data.allowAccess[1];
    expect(feedbackAccess.mode).to.equal("Public");
    expect(feedbackAccess.uids).to.deep.equal([studentId]);
    expect(feedbackAccess.credit).to.equal(0);

    // startDate is automatically generated using toISOString(), which
    // always includes millisecond resolution.
    expect(feedbackAccess.startDate).to.equal("2025-05-03T10:30:00.000");
    expect(feedbackAccess.endDate).to.equal("2025-05-23T23:59:59");
    expect(feedbackAccess.active).to.be.false;
    expect(feedbackAccess).to.not.have.property("password");
    expect(feedbackAccess).to.not.have.property("timeLimitMin");

    // Student questions are all placed in one zone.
    const questionList = data.zones[0].questions;
    expect(questionList.length).to.equal(numQuestions);
    for (const [index, question] of questionList.entries()) {
      expect(question.id).to.equal(
        `gvQLCQuiz/regression1/${studentId}/question${index + 1}`
      );
      expect(question.points).to.equal(25);
    }
  }

  function verifyQuestionInfo(fileName: string, questionNum: string) {
    const data = JSON.parse(fs.readFileSync(fileName, "utf8"));
    expect(data.gradingMethod).to.equal("Manual");
    expect(data.type).to.equal("v3");
    expect(data.title).to.equal(`Regression Quiz 1 Q${questionNum}`);
    expect(data.topic).to.equal("regression");
    expect(data.uuid).to.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  }
});
