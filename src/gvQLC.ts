/************************************************************************************
 * 
 * gvQLC.ts
 * 
 * Core gvQLC data and constants
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

export const GVQLC = 'gvQLC';
export const quizQuestionsFileName = 'gvQLC_QuizQuestions.json';

// In-memory storage for comments and questions
// TODO: Replace any[] with correct type
export const state = {
    commentsData: [] as any [],
    questionsData: [] as any[],
    personalizedQuestionsData: [] as any[],
    configData: null as any,
    dataLoaded: false as any,
    modalErrorDisplayed: false as any,
    studentNameMapping: [] as any[]
};