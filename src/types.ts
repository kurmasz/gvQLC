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

// currently breaks automated tests as export flags are new
export interface ConfigData {
  submissionRoot: string | null;
  studentNameMapping: null | Record<string, string>;
  markdownFlag?: boolean | null;
  pdfFlag?: boolean | null;
  singlePageFlag?: boolean | null;
  includeAnswersFlag?: boolean | null;
}