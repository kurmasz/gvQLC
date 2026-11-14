import * as fs from "fs";
import * as path from "path";
import { createTypstCompiler, CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import { loadFonts } from "@myriaddreamin/typst.ts/options.init";
import type { PersonalizedQuestionsData } from "./types";

export interface StudentQuiz {
  student: string;
  questions: readonly PersonalizedQuestionsData[];
}

export function groupPdfQuestions(
  questions: readonly PersonalizedQuestionsData[],
  submissionRoot: string | null,
): StudentQuiz[] {
  const groups = new Map<string, PersonalizedQuestionsData[]>();
  const root = (submissionRoot ?? ".")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== ".");

  for (const question of questions) {
    if (question.excludeFromQuiz) {
      continue;
    }

    const parts = question.filePath
      .replace(/\\/g, "/")
      .split("/")
      .filter((part) => part && part !== ".");
    const matchIndex =
      root.length === 0
        ? 0
        : parts.findIndex((_, pathIndex) =>
            root.every((part, rootIndex) => parts[pathIndex + rootIndex] === part),
          );
    const rootIndex = matchIndex + root.length;
    const student = parts[rootIndex];
    if (matchIndex < 0 || !student || student === ".." || rootIndex >= parts.length - 1) {
      throw new Error(
        `Cannot identify the student for "${question.filePath}". Check submissionRoot in gvQLC.config.json.`,
      );
    }
    const group = groups.get(student) ?? [];
    group.push(question);
    groups.set(student, group);
  }
  return Array.from(groups, ([student, studentQuestions]) => ({
    student,
    questions: studentQuestions,
  }));
}

export function studentQuizData(quiz: StudentQuiz, title: string, language: string) {
  return JSON.stringify({
    title,
    student: quiz.student,
    language,
    questions: quiz.questions.map((question) => ({
      text: question.text,
      code: question.highlightedCode,
    })),
  });
}

export function pdfFileName(student: string, index: number): string {
  const label = student.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "student";
  return `${String(index + 1).padStart(3, "0")}-${label}.pdf`;
}

export async function createPdfQuizCompiler(extensionPath: string) {
  const compiler = createTypstCompiler();
  const fontFiles = [
    "DejaVuSerif.ttf",
    "DejaVuSerif-Bold.ttf",
    "DejaVuSerif-Italic.ttf",
    "DejaVuSansMono.ttf",
  ];
  const fonts = fontFiles.map((fileName) => {
    const fontPath = require.resolve(`dejavu-fonts-ttf/ttf/${fileName}`);
    return fs.readFileSync(fontPath);
  });

  await compiler.init({
    getModule: () =>
      fs.readFileSync(require.resolve("@myriaddreamin/typst-ts-web-compiler/wasm")),
    beforeBuild: [loadFonts(fonts, { assets: false })],
  });
  const templatePath = path.join(extensionPath, "templates", "student-quiz.typ");
  compiler.addSource("/main.typ", fs.readFileSync(templatePath, "utf8"));

  return {
    async compile(quiz: StudentQuiz, title: string, language = "") {
      compiler.mapShadow(
        "/quiz.json",
        Buffer.from(studentQuizData(quiz, title, language)),
      );
      const result = await compiler.compile({
        mainFilePath: "/main.typ",
        root: "/",
        format: CompileFormatEnum.pdf,
        diagnostics: "unix",
      });
      const hasErrors = result.diagnostics?.some((message) => message.includes("error:"));

      if (!result.result || hasErrors) {
        const details = result.diagnostics?.join("\n") ?? "No PDF produced";
        throw new Error(`PDF compilation failed for ${quiz.student}:\n${details}`);
      }

      return result.result;
    },
  };
}
