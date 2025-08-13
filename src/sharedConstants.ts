/************************************************************************************
 * 
 * sharedConstants.ts
 * 
 * Constants used by both the extension and the automated tests.
 * 
 * This code is also used by the tests, so don't include any packages that require
 * the vscode framework (e.g., vscode)
 * 
 * (C) 2025 Zachary Kurmas
 * *********************************************************************************/

export enum ViewColors {
    RED = 'rgba(255, 184, 181, 1)',   // '#ffb8b5'
    GREEN = 'rgba(208, 240, 208, 1)', // '#d0f0d0',
    YELLOW = 'rgba(255, 255, 178, 1)' // '#ffffb2'
};