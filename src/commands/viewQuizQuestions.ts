/************************************************************************************
 * 
 * viewQuizQuestions.ts
 * 
 * The viewQuizQuestions command.
 * 
 * (C) 2025 Benedict Osei Sefa and Zachary Kurmas
 * *********************************************************************************/

import * as vscode from 'vscode';

import * as gvQLC from '../gvQLC';
const state = gvQLC.state;

import { extractStudentName } from '../utilities';
import * as Util from '../utilities';
import { PersonalizedQuestionsData } from '../types';
import { logToFile } from '../fileLogger';


export const viewQuizQuestionsCommand = vscode.commands.registerCommand('gvqlc.viewQuizQuestions', async () => {

    // Also displays error if persisted data cannot be loaded.
    if (!Util.loadPersistedData()) {
        console.log('Could not load data');
        return false;
    }

    if (state.personalizedQuestionsData.length === 0) {
        vscode.window.showInformationMessage('No personalized questions added yet!');
        return;
    }

    // Convert relative paths to absolute paths for display
    // TODO: I don't think we need this
    /*
    const questionsWithAbsolutePaths = state.personalizedQuestionsData.map(question => {
        const newPath = path.isAbsolute(question.filePath) ? question.filePath : path.join(gvQLC.workspaceRoot().name, question.filePath);
        return {
            ...question,
            filePath: newPath,
            relativePath: question.filePath
        };
    });
    */

    /*
    const getAllCISStudents = async () => {
        try {
            const cisStudents = new Set<string>();
            let quizDirectoryName = "CIS"; // Default fallback

            // Get quiz directory name from config
            const config = await gvQLC.config();
            if (config.submissionRoot) {
                quizDirectoryName = config.submissionRoot;
            }

            // Look for students in the specified directory
            const folderUri = gvQLC.workspaceRoot().uri;
            if (folderUri.fsPath.includes(quizDirectoryName)) {
                const files = await vscode.workspace.fs.readDirectory(folderUri);
                for (const [name, type] of files) {
                    if (type === vscode.FileType.Directory) {
                        cisStudents.add(name);
                    }
                }
            }

            return Array.from(cisStudents).sort();
        } catch (error) {
            console.error("Error fetching students:", error);
            return new Set<string>();
        }
    };
    */


    const mapStudentName = (name: string) => {
        return name;
        // return state.studentNameMapping[name] || name;
    };

    // config is lazy-loaded (so that the modal dialog asking the user to 
    // crate a config file is only shown if the user actually invokes a 
    // command that needs a config file).
    // Because the function is async, it is cleaner and more efficient to hold
    // onto the config and pass it around once we obtain it.
    const config = await gvQLC.config(true);
    const allStudentsPromise = Util.getAllStudentNames(config);

    const questionsByStudent: Record<string, PersonalizedQuestionsData[]> = {};
    const submissionRoot = config.submissionRoot;
    for (const question of state.personalizedQuestionsData) {
        const studentName = extractStudentName(question.filePath, submissionRoot);
        if (!questionsByStudent[studentName]) {
            questionsByStudent[studentName] = [];
        }
        questionsByStudent[studentName].push(question);
    }

    const frequencyMap = new Map<number, number>();

    const studentQuestionCounts = new Map<string, number>();
    let maxQuestions = 0;
    for (const studentName in questionsByStudent) {
        const count = questionsByStudent[studentName].length;
        studentQuestionCounts.set(studentName, count);
        if (count > maxQuestions) {
            maxQuestions = count;
        }
        frequencyMap.set(count, (frequencyMap.get(count) ?? 0) + 1);
    }

    // Compute the mode (most common question count)
    let modeQuestions = -1;
    let highestFrequency = 0;

    for (const [count, freq] of frequencyMap.entries()) {
        if (freq > highestFrequency || (freq === highestFrequency && count > modeQuestions)) {
            highestFrequency = freq;
            modeQuestions = count;
        }
    }

    console.log(`Max questions assigned to any student: ${maxQuestions}`);
    console.log(`Most common number of questions (mode): ${modeQuestions}`);

    const questionLabels: Record<string, string> = {};
    const studentNumbers: Record<string, number> = {};

    let studentCounter = 1;
    let questionIndex = 0;
    const sortedStudentNames = Object.keys(questionsByStudent).sort();

    for (const studentName of sortedStudentNames) {
        studentNumbers[studentName] = studentCounter;
        const questions = questionsByStudent[studentName];
        questions.forEach((_, qIndex) => {
            const startingCode = 'a'.charCodeAt(0);
            const questionLabel = `${studentCounter}${String.fromCharCode(startingCode + qIndex)}`;
            questionLabels[questionIndex] = questionLabel;
            questionIndex++;
        });
        studentCounter++;
    }

    const reorderedQuestions: PersonalizedQuestionsData[] = [];
    for (const studentName of sortedStudentNames) {
        reorderedQuestions.push(...questionsByStudent[studentName]);
    }

    const buildSummaryTable = (allStudentNames: string[]) => {

        // Create a list of student names where those students with 
        // no questions are at the end of the list.
        const allStudents: string[] = Array.from(new Set<string>([
            ...Object.keys(questionsByStudent),
            ...allStudentNames
        ])).sort();

        const summaryRows = allStudents.map(student => {
            const count = studentQuestionCounts.get(student) || 0;
            const hasQuestions = count > 0;
            let color = Util.chooseQuestionColor(count, modeQuestions);
            const displayName = mapStudentName(student);
            return `
              <tr style="background-color: ${color}">
                  <td>${displayName}</td>
                  <td>${count}</td>
                  <td>${hasQuestions ? '✓' : '✗'}</td>
              </tr>
          `;
        }).join('');

        return `
          <div id="summaryTableContainer" style="display: none; max-height: 300px; overflow-y: auto; margin-top: 20px;">
              <h2>Student Question Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                      <tr>
                          <th>Student Name</th>
                          <th>Question Count</th>
                          <th>Has Questions</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${summaryRows}
                  </tbody>
              </table>
          </div>
      `;
    };

    const truncateCharacters = (text: string, charLimit: number) => {
        return text.length > charLimit ? text.slice(0, charLimit) + '...' : text;
    };

    const questionsTable = reorderedQuestions.map((question, index) => {
        const studentName = extractStudentName(question.filePath, submissionRoot);
        const count = studentQuestionCounts.get(studentName) || 0;
        const labelColor = Util.chooseQuestionColor(count, modeQuestions);
        const filePathParts = question.filePath.split('/');
        let shortenedFilePath = filePathParts.length > 2
            ? `.../${filePathParts.slice(-3).join('/')}`
            : question.filePath;
        shortenedFilePath = truncateCharacters(shortenedFilePath, 30);

        const escapeHtmlAttr = (str: string) => {
            return String(str)
                .replace(/&/g, '&amp;')  // must go first
                .replace(/"/g, '&quot;') // double quotes
                .replace(/'/g, '&#39;')  // single quotes
                .replace(/</g, '&lt;')   // optional
                .replace(/>/g, '&gt;');  // optional
        };

        const highlightedCode = escapeHtmlAttr(question.highlightedCode);

        return `
          <tr id="row-${index}" data-index="${index}" data-label="${questionLabels[index]}" data-file="${shortenedFilePath}" data-code="${highlightedCode || 'No highlighted code'}" data-question="${question.text || 'No question'}">
              <td style="background-color: ${labelColor}">${questionLabels[index]}</td>
              <td title="${question.filePath}">${shortenedFilePath}</td>
              <td>
                  <textarea class="code-area" id="code-${index}">${highlightedCode || 'No highlighted code'}</textarea>
              </td>
              <td>
                  <textarea class="question-area" id="question-${index}">${question.text || 'No question'}</textarea>
              </td>
              <td>
                  <button onclick="saveChanges(${index})">Save</button>
                  <button onclick="revertChanges(${index})" style="background-color: orange; color: white;">Revert</button>
                  <button onclick="editQuestion(${index})" style="background-color: green; color: white;">Edit</button>
                  <button onclick="copyQuestionText(${index})" style="background-color: #2196F3; color: white;">Copy</button>
                  <br>
                  <input type="checkbox" id="exclude-${index}" ${question.excludeFromQuiz ? 'checked' : ''} onchange="toggleExclude(${index})">
                  <label for="exclude-${index}">Exclude from Quiz</label>
              </td>
          </tr>
      `;
    }).join('');

    // Create a Webview Panel for viewing personalized questions
    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
        'viewPersonalizedQuestions',
        'View Quiz Questions',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    const data = {
        totalQuestions: reorderedQuestions.length,
        summaryTable: buildSummaryTable(await allStudentsPromise),
        questionsTable: questionsTable,
        originalData: JSON.stringify(reorderedQuestions),
        questionLabels: JSON.stringify(questionLabels)

    };
    panel.webview.html = Util.renderMustache('quizQuestions.mustache.html', data);
    const foo = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Quiz Questions</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color:rgb(255, 255, 255);
            color: black;
        }
        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .controls-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            align-items: center;
            flex-wrap: wrap;
        }
        .search-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #007acc;
            color: white;
            position: sticky;
            top: 0;
        }
        textarea {
            width: 100%;
            height: 100px;
            font-size: 14px;
            border: 1px solid #ccc;
            padding: 8px;
            resize: vertical;
        }
        .code-area {
            background-color: #1e1e1e;
            color: #d4d4d4;
            font-family: monospace;
        }
        .question-area {
            background-color: #f9f9f9;
            color: #333;
            font-family: sans-serif;
        }
        button {
            padding: 8px 12px;
            margin: 2px;
            cursor: pointer;
            border: none;
            border-radius: 4px;
            font-weight: bold;
        }
        button:hover {
            opacity: 0.9;
        }
        #refreshBtn {
            background-color: #4CAF50;
            color: white;
        }
        #toggleSummaryBtn {
            background-color: #673AB7;
            color: white;
        }
        input[type="text"] {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 250px;
        }
        input[type="checkbox"] {
            transform: scale(1.2);
            margin-top: 5px;
        }
        #summaryTableContainer table th {
            background-color: #007acc;
            color: white;
        }
        #summaryTableContainer table td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        .total-count {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 20px;
            gap: 10px;
            flex-wrap: wrap;
        }
        .pagination-controls {
            display: flex;
            gap: 5px;
            align-items: center;
        }
        .page-btn {
            padding: 5px 10px;
            border: 1px solid #ddd;
            background-color: white;
            cursor: pointer;
            border-radius: 4px;
            min-width: 30px;
            text-align: center;
        }
        .page-btn:hover:not(.active):not(:disabled) {
            background-color: #f1f1f1;
        }
        .page-btn.active {
            background-color: #007acc;
            color: white;
            border-color: #007acc;
        }
        .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .page-jump {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .page-jump input {
            width: 50px;
            padding: 5px;
            text-align: center;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .rows-per-page {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .rows-per-page select {
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="header-container">
        <h1>All Quiz Questions</h1>
        <div class="total-count">Total Questions: ${reorderedQuestions.length}</div>
    </div>

    <div class="controls-container">
        <button id="refreshBtn" onclick="refreshView()">Refresh View</button>
        <button id="toggleSummaryBtn" onclick="toggleSummaryTable()">Toggle Student Summary</button>
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search questions..." oninput="filterQuestions()">
            <span id="filterCount"></span>
        </div>
    </div>

    ${buildSummaryTable(await allStudentsPromise)}

    <table id="questionsTable">
        <thead>
            <tr>
                <th>#</th>
                <th>File</th>
                <th>Highlighted Code</th>
                <th>Question</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="questionsTableBody">
            ${questionsTable}
        </tbody>
    </table>

    <div class="pagination-container">
        <div class="pagination-controls">
            <button class="page-btn" onclick="goToFirstPage()" title="First Page" id="firstPageBtn">&laquo;</button>
            <button class="page-btn" onclick="goToPreviousPage()" title="Previous Page" id="prevPageBtn">&lt;</button>
            <div id="pageNumbers" style="display: flex; gap: 5px;"></div>
            <button class="page-btn" onclick="goToNextPage()" title="Next Page" id="nextPageBtn">&gt;</button>
            <button class="page-btn" onclick="goToLastPage()" title="Last Page" id="lastPageBtn">&raquo;</button>
        </div>

        <div class="page-jump">
            <span>Go to:</span>
            <input type="number" id="pageJumpInput" min="1" value="1">
            <button onclick="jumpToPage()">Go</button>
            <span>of <span id="totalPagesDisplay">1</span></span>
        </div>

        <div class="rows-per-page">
            <label for="rowsPerPage">Rows per page:</label>
            <select id="rowsPerPage" onchange="changeRowsPerPage()">
                <option value="10">10</option>
                <option value="15" selected>15</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const originalData = JSON.parse(JSON.stringify(${JSON.stringify(reorderedQuestions)}));
        const questionLabels = JSON.parse('${JSON.stringify(questionLabels)}');

        // Pagination variables
        let currentPage = 1;
        let rowsPerPage = 15;
        let totalPages = Math.ceil(${reorderedQuestions.length} / rowsPerPage);
        let filteredRows = [];
        let isFiltered = false;

        // Initialize the table
        function initializeTable() {
            updatePaginationControls();
            renderPageNumbers();
            updateVisibleRows();
        }

        function filterQuestionsXXX() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#questionsTableBody tr');
            filteredRows = [];

            if (searchTerm === '') {
                isFiltered = false;
                document.getElementById('filterCount').textContent = '';
            } else {
                isFiltered = true;
                rows.forEach((row, index) => {
                    const label = row.dataset.label.toLowerCase();
                    const file = row.dataset.file.toLowerCase();
                    const code = row.dataset.code.toLowerCase();
                    const question = row.dataset.question.toLowerCase();

                    if (label.includes(searchTerm) || file.includes(searchTerm) ||
                        code.includes(searchTerm) || question.includes(searchTerm)) {
                        filteredRows.push(index);
                    }
                });

                document.getElementById('filterCount').textContent = filteredRows.length > 0
                    ? \`\${filteredRows.length} matches\`
                    : 'No matches';
            }

            totalPages = Math.ceil(isFiltered ? filteredRows.length : ${reorderedQuestions.length} / rowsPerPage);
            currentPage = 1;
            initializeTable();
        }        



        // Update which rows are visible based on current page
        function updateVisibleRows() {
            const rows = document.querySelectorAll('#questionsTableBody tr');
            const startIdx = (currentPage - 1) * rowsPerPage;
            const endIdx = startIdx + rowsPerPage;

            rows.forEach((row, index) => {
                if (isFiltered && !filteredRows.includes(index)) {
                    row.style.display = 'none';
                    return;
                }

                if (index >= startIdx && index < endIdx) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        // Update pagination controls state
        function updatePaginationControls() {
            document.getElementById('firstPageBtn').disabled = currentPage === 1;
            document.getElementById('prevPageBtn').disabled = currentPage === 1;
            document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
            document.getElementById('lastPageBtn').disabled = currentPage === totalPages;
            document.getElementById('pageJumpInput').value = currentPage;
            document.getElementById('totalPagesDisplay').textContent = totalPages;
        }

        // Render page number buttons
        function renderPageNumbers() {
            const container = document.getElementById('pageNumbers');
            container.innerHTML = '';

            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            if (startPage > 1) {
                const btn = document.createElement('button');
                btn.className = 'page-btn';
                btn.textContent = '1';
                btn.onclick = () => goToPage(1);
                container.appendChild(btn);

                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    container.appendChild(ellipsis);
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('button');
                btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
                btn.textContent = i;
                btn.onclick = () => goToPage(i);
                container.appendChild(btn);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    container.appendChild(ellipsis);
                }

                const btn = document.createElement('button');
                btn.className = 'page-btn';
                btn.textContent = totalPages;
                btn.onclick = () => goToPage(totalPages);
                container.appendChild(btn);
            }
        }

        // Navigation functions
        function goToPage(page) {
            if (page < 1 || page > totalPages) return;
            currentPage = page;
            updateVisibleRows();
            updatePaginationControls();
            renderPageNumbers();
        }

        function goToFirstPage() {
            goToPage(1);
        }

        function goToPreviousPage() {
            goToPage(currentPage - 1);
        }

        function goToNextPage() {
            goToPage(currentPage + 1);
        }

        function goToLastPage() {
            goToPage(totalPages);
        }

        function jumpToPage() {
            const input = document.getElementById('pageJumpInput');
            const page = parseInt(input.value);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
                goToPage(page);
            }
        }

        // Change rows per page
        function changeRowsPerPage() {
            rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
            totalPages = Math.ceil(isFiltered ? filteredRows.length : ${reorderedQuestions.length} / rowsPerPage);
            if (currentPage > totalPages) {
                currentPage = totalPages;
            }
            initializeTable();
        }

        // Filter questions based on search term
        function filterQuestions() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#questionsTableBody tr');
            filteredRows = [];

            if (searchTerm === '') {
                isFiltered = false;
                document.getElementById('filterCount').textContent = '';
            } else {
                isFiltered = true;
                rows.forEach((row, index) => {
                    const label = row.dataset.label.toLowerCase();
                    const file = row.dataset.file.toLowerCase();
                    const code = row.dataset.code.toLowerCase();
                    const question = row.dataset.question.toLowerCase();

                    if (label.includes(searchTerm) || file.includes(searchTerm) ||
                        code.includes(searchTerm) || question.includes(searchTerm)) {
                        filteredRows.push(index);
                    }
                });

                document.getElementById('filterCount').textContent = filteredRows.length > 0
                    ? \`\${filteredRows.length} matches\`
                    : 'No matches';
            }

            totalPages = Math.ceil(isFiltered ? filteredRows.length : ${reorderedQuestions.length} / rowsPerPage);
            currentPage = 1;
            initializeTable();
        }

        function copyQuestionText(index) {
            const questionTextArea = document.getElementById('question-' + index);
            const selectedText = questionTextArea.value.substring(
                questionTextArea.selectionStart,
                questionTextArea.selectionEnd
            );
            const textToCopy = selectedText.length > 0 ? selectedText : questionTextArea.value;

            navigator.clipboard.writeText(textToCopy).then(() => {
                vscode.postMessage({
                    type: 'showInformationMessage',
                    message: 'Copied to clipboard: ' +
                        (selectedText.length > 0 ? 'Selected text' : 'Full question')
                });
            }).catch(err => {
                vscode.postMessage({
                    type: 'showErrorMessage',
                    message: 'Failed to copy text: ' + err
                });
            });
        }

        function toggleSummaryTable() {
            const container = document.getElementById('summaryTableContainer');
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }

        function refreshView() {
            vscode.postMessage({ type: 'refreshView' });
        }

        function saveChanges(index) {
            const updatedCode = document.getElementById('code-' + index).value;
            const updatedQuestion = document.getElementById('question-' + index).value;
            vscode.postMessage({ type: 'saveChanges', index, updatedCode, updatedQuestion });
        }

        function revertChanges(index) {
            document.getElementById('code-' + index).value = originalData[index].highlightedCode;
            document.getElementById('question-' + index).value = originalData[index].text;
            document.getElementById('exclude-' + index).checked = originalData[index].excludeFromQuiz;
        }

        function toggleExclude(index) {
            const excludeStatus = document.getElementById('exclude-' + index).checked;
            vscode.postMessage({ type: 'toggleExclude', index, excludeStatus });
        }

        function editQuestion(index) {
            vscode.postMessage({ type: 'editQuestion', index });
        }

        // Initialize the table when the page loads
        window.addEventListener('load', initializeTable);
    </script>
</body>
</html>
    `;

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'saveChanges') {
            reorderedQuestions[message.index].highlightedCode = message.updatedCode;
            reorderedQuestions[message.index].text = message.updatedQuestion;
            logToFile('Re-assigning personalizedQuestonsData with reordered questions from saveChanges');
            state.personalizedQuestionsData = reorderedQuestions;
            Util.saveDataToFile('personalizedQuestions.json', state.personalizedQuestionsData);
            vscode.window.showInformationMessage('Changes saved successfully!');
        }

        if (message.type === 'toggleExclude') {
            reorderedQuestions[message.index].excludeFromQuiz = message.excludeStatus;
            logToFile('Re-assigning personalizedQuestonsData with reordered questions from toggleExclude');
            state.personalizedQuestionsData = reorderedQuestions;
            Util.saveDataToFile('personalizedQuestions.json', state.personalizedQuestionsData);
        }

        if (message.type === 'editQuestion') {
            vscode.window.showErrorMessage("Prepare openQuestionPanel and uncomment line below", message, { modal: true }, "OK");
            // openEditQuestionPanel(message.index);
        }

        if (message.type === 'refreshView') {
            panel.dispose();
            vscode.commands.executeCommand('gvqlc.viewQuizQuestions');
        }

        if (message.type === 'showInformationMessage') {
            vscode.window.showInformationMessage(message.message);
        }

        if (message.type === 'showErrorMessage') {
            vscode.window.showErrorMessage(message.message);
        }
    });
});