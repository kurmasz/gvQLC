/************************************************************************************
 * 
 * types.ts
 * 
 * Type definitions
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

export type PersonalizedQuestionsData = {
    filePath: string,
    text: string,
    range: {
        start: {line: number, character: number},
        end: {line: number, character: number}
    },
    highlightedCode: string,
    excludeFromQuiz: boolean
};

export interface ConfigData {
  submissionRoot: string | null;
  studentNameMapping: null | Record<string, string>;

  startDate: string;
  timeLimitMin: number;
  reviewEndDate: string;
  daysForGrading: number;

  pl_ready: boolean;
  pl_root: string;
  pl_question_root: string;
  pl_assessment_root: string;
  pl_quiz_folder: string;

  [key: string]: string | number | boolean | null | Record<string, string>;
}