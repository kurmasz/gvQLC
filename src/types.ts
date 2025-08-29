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
}