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

import { setPLRoot, verifyDirectoryContents, verifyExactDirectoryContents } from "../helpers/plHelpers";

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
  it("creates a config file if necessary and notifies", async () => {
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
      (message) => message === `Config file created: ${configPath}`
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
        "uncle_bob"
      ],
      ['larry', 'sam', 'taylor', 'team_1', 'team_name']
    );

    // Verify student directories have one directory per question
     verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'awesome'], ['question1', 'question2']);
    verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'jim'], ['question1', 'question2', 'question3']);
    verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'neptune_man'], ['question1']);
    verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'instructor'], ['combined_questions']);

    // Verify content of question directories
    verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'awesome', 'question1'], ['info.json', 'question.html']);
    verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'awesome', 'question2'], ['info.json', 'question.html']);
    verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'jim', 'question3'], ['info.json', 'question.html']);
    verifyExactDirectoryContents(
      [tempPLDir, 'questions', 'gvQLCQuiz', 'regression1', 'instructor', 'combined_questions'], ['info.json', 'question.html']);

    // Verify that the assessments folder was created and contains a folder for each 
    // student that has questions, plus an "instructor" assessment
    verifyDirectoryContents(
      [tempPLDir, 'courseInstances', 'SectionA', 'assessments', 'regression1'],
      [
        "antonio",
        "awesome",
        "caleb2",
        "cooper",
        "george",
        "instructor",
        "jim",
        "neptune_man", 
        "uncle_bob"
      ],
      ['larry', 'sam', 'taylor', 'team_1', 'team_name']
    );

    // Verify that the student assessment directory contains `infoAssessment.json`
    // Just test a couple.  There is no good reason for any directory to be missing infoAssessment.json
    for (const item of ['antonio', 'caleb2', 'jim', 'uncle_bob']) {
        verifyExactDirectoryContents([tempPLDir, 'courseInstances', 'SectionA', 'assessments', 'regression1', item], ['infoAssessment.json']);
    }
    verifyExactDirectoryContents([tempPLDir, 'courseInstances', 'SectionA', 'assessments', 'regression1', 'instructor'], ['infoAssessment.json']);
 





  });
});
