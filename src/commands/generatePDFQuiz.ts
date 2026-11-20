import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { config, context, state } from "../gvQLC";
import { loadPersistedData, getWorkspaceDirectory } from "../utilities";
import { createPdfQuizCompiler, groupPdfQuestions, pdfFileName } from "../pdfQuiz";

let exporting = false;

export const generatePDFQuizCommand = vscode.commands.registerCommand(
  "gvqlc.generatePDFQuiz",
  async () => {
    if (exporting) {
      vscode.window.showInformationMessage("A PDF quiz export is already running.");
      return;
    }
    exporting = true;
    let output: string | undefined;

    try {
      if (!loadPersistedData()) {
        return;
      }

      if (!state.personalizedQuestionsData.some((q) => !q.excludeFromQuiz)) {
        vscode.window.showErrorMessage(
          "No included personalized questions available to export!",
        );
        return;
      }
      const settings = await config(true);
      const quizzes = groupPdfQuestions(
        state.personalizedQuestionsData,
        settings.submissionRoot,
        typeof settings.pdfStudentName === "string" ? settings.pdfStudentName : undefined,
      );
      const title = await vscode.window.showInputBox({
        title: "PDF quiz title",
        value: typeof settings.title === "string" ? settings.title : "Code Quiz",
        validateInput: (value) => (value.trim() ? undefined : "Enter a quiz title."),
      });
      if (title === undefined) {
        return;
      }

      const destination = await vscode.window.showOpenDialog({
        title: "Choose a folder for the student PDFs",
        defaultUri: vscode.Uri.file(getWorkspaceDirectory()),
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Export quizzes here",
      });
      if (!destination?.length) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Exporting student quizzes",
        },
        async (progress) => {
          // A new directory avoids overwriting an earlier export or unrelated PDFs.
          output = await fs.mkdtemp(path.join(destination[0].fsPath, "gvQLC-quizzes-"));
          const compiler = await createPdfQuizCompiler(context().extensionPath);
          const language = typeof settings.language === "string" ? settings.language : "";

          for (const [index, quiz] of quizzes.entries()) {
            progress.report({
              message: `${index + 1}/${quizzes.length}: ${quiz.student}`,
            });
            const pdf = await compiler.compile(quiz, title.trim(), language);
            await fs.writeFile(path.join(output, pdfFileName(quiz.student, index)), pdf, {
              flag: "wx",
            });
          }
        },
      );
      vscode.window.showInformationMessage(
        `Exported ${quizzes.length} student quiz PDFs to ${output}`,
      );
      return output;
    } catch (error) {
      // Never leave a partial set of handouts looking like a completed export.
      if (output) {
        await fs.rm(output, { recursive: true, force: true }).catch(() => undefined);
      }

      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Unable to export PDF quizzes: ${message}`);
      return false;
    } finally {
      exporting = false;
    }
  },
);
