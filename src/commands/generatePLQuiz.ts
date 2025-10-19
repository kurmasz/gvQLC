/************************************************************************************
 *
 * generatePLQuiz.ts
 *
 * The generatePLQuiz command.
 *
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs";

import { randomUUID } from "crypto";

import { state, config as getConfig } from "../gvQLC";
import { quizQuestionsFileName } from "../sharedConstants";

import * as Util from "../utilities";
import { PersonalizedQuestionsData } from "../types";
import { openConfigFileEditTab } from "../configFile";
import { logToFile } from "../fileLogger";


export const generatePLQuizCommand = vscode.commands.registerCommand(
  "gvqlc.generatePLQuiz",
  async () => {
    // This should verify that a workspace is open and return if not.
    if (!Util.loadPersistedData()) {
      return false;
    }
    // It is important that the question length be tested before
    // accessing the config file. That way we don't create a config
    // file unless there are existing questions.
    if (state.personalizedQuestionsData.length === 0) {
      vscode.window.showErrorMessage(
        "No personalized questions available to generate the quiz!"
      );
      return;
    }

    // Calling getConfig() and openConfigFile()
    // here is safe because we have already verified that
    // there is a workspace open.
    const config = await getConfig(true);
    if (!config.pl_ready) {
      vscode.window.showErrorMessage("Config file has not been customized.");

      // TODO: Add test to verify that window is opened in a different column
      openConfigFileEditTab();
      return;
    }

    // TODO: Add test to verify that missing fields are detected
    // Validate required fields in config
    const requiredFields = [
      "title",
      "topic",
      "pl_root",
      "pl_question_root",
      "pl_assessment_root",
      "pl_quiz_folder",
      "set",
      "number",
      "points_per_question",
      "startDate",
      "endDate",
      "timeLimitMin",
      "daysForGrading",
      "reviewEndDate",
      "language",
    ];
    for (const field of requiredFields) {
      if (!config[field]) {
        vscode.window.showErrorMessage(
          `Missing required field in config: ${field}`
        );
        return;
      }
    }

    // Construct paths
    const questionsFolderPath = path.join(
      config.pl_root,
      "questions",
      config.pl_question_root,
      config.pl_quiz_folder
    );
    const assessmentFolderPath = path.join(
      config.pl_root,
      config.pl_assessment_root,
      config.pl_quiz_folder
    );
    const instructorFolderPath = path.join(questionsFolderPath, "instructor");
    const instructorAssessmentPath = path.join(
      assessmentFolderPath,
      "instructor"
    );

    // Ensure directories exist
    [
      questionsFolderPath,
      assessmentFolderPath,
      instructorFolderPath,
      instructorAssessmentPath,
    ].forEach((folder) => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    });

    // TODO: What's going on here?
    console.log("(cl) SubmissionRoot is ", config.submissionRoot);
    if (!config.submissionRoot) {
      vscode.window.showErrorMessage(
        `(window) submissionRoot is =>${config.submissionRoot}<=.`
      );
    }

    // Group questions by student
    const questionsByStudent: Record<string, PersonalizedQuestionsData[]> = {};
    for (const question of state.personalizedQuestionsData) {
      const studentName = Util.extractStudentName(
        question.filePath,
        config.submissionRoot
      );
      if (!questionsByStudent[studentName]) {
        questionsByStudent[studentName] = [];
      }
      questionsByStudent[studentName].push(question);
    }

    // Generate questions and info.json files for each student
    for (const [studentName, questions] of Object.entries(questionsByStudent)) {
      // Create the student's question folder
      const studentQuestionFolderPath = path.join(
        questionsFolderPath,
        studentName
      );
      if (!fs.existsSync(studentQuestionFolderPath)) {
        fs.mkdirSync(studentQuestionFolderPath, { recursive: true });
      }

      // Generate question.html and info.json for each question
      for (const [index, question] of questions.entries()) {
        const questionFolderPath = path.join(
          studentQuestionFolderPath,
          `question${index + 1}`
        );
        if (!fs.existsSync(questionFolderPath)) {
          fs.mkdirSync(questionFolderPath, { recursive: true });
        }

        // Create question.html with proper PL structure
        const questionHTMLContent = `
<pl-question-panel>
<markdown>
${question.text || "No question text provided"}
</markdown>
    ${
      question.highlightedCode
        ? `<pl-code language="${config.language}">\n${Util.escapeHtmlAttr(
            question.highlightedCode
          )}\n</pl-code>`
        : ""
    }
</pl-question-panel>`;

        fs.writeFileSync(
          path.join(questionFolderPath, "question.html"),
          questionHTMLContent
        );

        // Create info.json
        fs.writeFileSync(
          path.join(questionFolderPath, "info.json"),
          JSON.stringify(
            {
              uuid: randomUUID(),
              type: "v3",
              gradingMethod: "Manual",
              title: `${config.title} Q${index + 1}`,
              topic: config.topic,
            },
            null,
            2
          )
        );
      }

      // Create the student's assessment folder
      const studentAssessmentFolderPath = path.join(
        assessmentFolderPath,
        studentName
      );
      if (!fs.existsSync(studentAssessmentFolderPath)) {
        fs.mkdirSync(studentAssessmentFolderPath, { recursive: true });
      }

      // toISOString will add a time zone (UTC by default).
      const startOfReviewUTC = new Date(
        new Date(config.startDate).getTime() + config.daysForGrading * 86400000
      ).toISOString();

      // Remove teh time zone component so that PL
      // will interpret the value in local time (as defined
      // by the course).
      const startOfReview = startOfReviewUTC.endsWith('Z') ? startOfReviewUTC.slice(0, -1) : startOfReviewUTC;


      // Generate infoAssessment.json for student
      const infoAssessmentContent = {
        uuid: randomUUID(),
        type: "Exam",
        title: config.title,
        set: config.set,
        number: config.number,
        allowAccess: [
          {
            mode: "Public",
            uids: [studentName],
            credit: 100,
            timeLimitMin: config.timeLimitMin,
            startDate: config.startDate,
            endDate: config.endDate,
            ...(config.password && { password: config.password }),
          },
          {
            mode: "Public",
            uids: [studentName],
            credit: 0,
            startDate: startOfReview,
            endDate: config.reviewEndDate,
            active: false,
          },
        ],
        zones: [
          {
            questions: questions.map((q, index) => ({
              id: `${config.pl_question_root}/${
                config.pl_quiz_folder
              }/${studentName}/question${index + 1}`,
              points: config.points_per_question,
            })),
          },
        ],
      };

      fs.writeFileSync(
        path.join(studentAssessmentFolderPath, "infoAssessment.json"),
        JSON.stringify(infoAssessmentContent, null, 2)
      );
    }

    // Generate combined question file for instructor
    const instructorQuestionFolderPath = path.join(
      instructorFolderPath,
      "combined_questions"
    );
    if (!fs.existsSync(instructorQuestionFolderPath)) {
      fs.mkdirSync(instructorQuestionFolderPath, { recursive: true });
    }

    // Create combined question.html with proper PL structure
    let combinedHTMLContent = `<pl-question-panel>
<markdown>
# ${config.title} - All Student Questions
<hr><br>
</markdown>
</pl-question-panel>`;

    // Add each student's questions
    for (const [studentName, questions] of Object.entries(questionsByStudent)) {
      combinedHTMLContent += `
<pl-question-panel>
<markdown>
## Student: ${studentName}
</markdown>
</pl-question-panel>`;

      questions.forEach((question, index) => {
        // Extract the code blocks and question text
        const questionText = question.text || "No question text provided";
        const codeBlock = question.highlightedCode
          ? `<pl-code language="${config.language}">\n${Util.escapeHtmlAttr(
              question.highlightedCode
            )}\n</pl-code>`
          : "";

        combinedHTMLContent += `
<pl-question-panel>
<markdown>
### Question ${index + 1}
${questionText}
</markdown>
    ${codeBlock}
</pl-question-panel>
<br><hr><br>
`;
      });
    }

    // Write the combined question file
    fs.writeFileSync(
      path.join(instructorQuestionFolderPath, "question.html"),
      combinedHTMLContent
    );

    // Write instructor info.json
    fs.writeFileSync(
      path.join(instructorQuestionFolderPath, "info.json"),
      JSON.stringify(
        {
          uuid: randomUUID(),
          gradingMethod: "Manual",
          type: "v3",
          title: `${config.title} - All Questions`,
          topic: config.topic,
        },
        null,
        2
      )
    );

    // Generate instructor assessment file
    const instructorInfoAssessmentContent = {
      uuid: randomUUID(),
      type: "Exam",
      title: `${config.title} (Instructor View)`,
      set: config.set,
      number: config.number,
      allowAccess: [
        {
          mode: "Public",
          uids: ["instructor"],
          credit: 100,
          timeLimitMin: config.timeLimitMin * 3,
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date(
            new Date(Date.now()).getTime() + 86_400_000_1000 // 1000 days
          ).toISOString(),
          active: true,
        },
      ],
      zones: [
        {
          title: "Combined Questions",
          questions: [
            {
              id: `${config.pl_question_root}/${config.pl_quiz_folder}/instructor/combined_questions`,
              points: 0,
              description: "All student questions combined",
            },
          ],
        },
      ],
    };

    fs.writeFileSync(
      path.join(instructorAssessmentPath, "infoAssessment.json"),
      JSON.stringify(instructorInfoAssessmentContent, null, 2)
    );

    vscode.window.showInformationMessage(
      "Successfully generated PrairieLearn Quiz."
    );

    /*
    vscode.window.showInformationMessage(
      `Successfully generated personalized quiz!\n\n` +
        `Student questions: ${questionsFolderPath}\n` +
        `Student assessments: ${assessmentFolderPath}\n` +
        `Instructor combined view: ${instructorQuestionFolderPath}\n` +
        `Instructor assessment: ${instructorAssessmentPath}`,
      { modal: true }
    );
    */
  }
);
