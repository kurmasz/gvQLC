import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';

// Use require for Node.js built-ins and external modules to avoid getter issues with import *
const fs = require('fs');
const Mustache = require('mustache');

import * as utilities from '../utilities';
import * as gvQLC from '../gvQLC';
import { ConfigData, PersonalizedQuestionsData } from '../types';
import { ViewColors, configFileName, quizQuestionsFileName } from '../sharedConstants';

suite('Utilities Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockWorkspace: vscode.WorkspaceFolder;
    let showErrorMessageStub: sinon.SinonStub;
    let showWarningMessageStub: sinon.SinonStub;
    let readFileSyncStub: sinon.SinonStub;
    let writeFileSyncStub: sinon.SinonStub;
    let existsSyncStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockWorkspace = {
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0
        } as vscode.WorkspaceFolder;

        // Mock vscode functions
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
        showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');
        
        // Create stubs for fs functions and assign directly
        readFileSyncStub = sandbox.stub();
        writeFileSyncStub = sandbox.stub();
        existsSyncStub = sandbox.stub();
        
        (fs as any).readFileSync = readFileSyncStub;
        (fs as any).writeFileSync = writeFileSyncStub;
        (fs as any).existsSync = existsSyncStub;

        // Mock workspace
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspace]);
        
        // Reset gvQLC state
        gvQLC.state.commentsData = [];
        gvQLC.state.questionsData = [];
        gvQLC.state.personalizedQuestionsData = [];
        gvQLC.state.dataLoaded = false;
        gvQLC.state.modalErrorDisplayed = false;
        gvQLC.state.studentNameMapping = {};
        
        gvQLC.setWorkspaceRoot(mockWorkspace);
    });

    teardown(() => {
        sandbox.restore();
        // Note: fs functions are not explicitly restored as they're module-level
        // and will be reset between test file executions
    });

    suite('getWorkspaceDirectory function', () => {
        test('should return workspace folder path when workspace exists', () => {
            const result = utilities.getWorkspaceDirectory();
            expect(result).to.equal('/test/workspace');
        });

        test('should throw error when no workspace folder found', () => {
            sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
            
            expect(() => utilities.getWorkspaceDirectory()).to.throw('No workspace folder found.');
        });

        test('should return first workspace when multiple exist', () => {
            const secondWorkspace = {
                uri: { fsPath: '/test/workspace2' },
                name: 'test-workspace2',
                index: 1
            } as vscode.WorkspaceFolder;
            
            sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspace, secondWorkspace]);
            
            const result = utilities.getWorkspaceDirectory();
            expect(result).to.equal('/test/workspace');
        });
    });

    suite('loadDataFromFile function', () => {
        test('should load JSON data from existing file', () => {
            const testData = { data: ['item1', 'item2'] };
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify(testData));
            
            const result = utilities.loadDataFromFile('test.json');
            
            expect(existsSyncStub.calledWith(path.join('/test/workspace', 'test.json'))).to.be.true;
            expect(readFileSyncStub.calledWith(path.join('/test/workspace', 'test.json'), 'utf-8')).to.be.true;
            expect(result).to.deep.equal(['item1', 'item2']);
        });

        test('should return array directly if data is array', () => {
            const testData = ['item1', 'item2'];
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify(testData));
            
            const result = utilities.loadDataFromFile('test.json');
            
            expect(result).to.deep.equal(['item1', 'item2']);
        });

        test('should return string directly if data is string', () => {
            const testData = 'test string';
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify(testData));
            
            const result = utilities.loadDataFromFile('test.json');
            
            expect(result).to.equal('test string');
        });

        test('should return empty array if file does not exist', () => {
            existsSyncStub.returns(false);
            
            const result = utilities.loadDataFromFile('nonexistent.json');
            
            expect(result).to.deep.equal([]);
            expect(readFileSyncStub.called).to.be.false;
        });

        test('should handle malformed JSON gracefully', () => {
            existsSyncStub.returns(true);
            readFileSyncStub.returns('invalid json');
            
            expect(() => utilities.loadDataFromFile('invalid.json')).to.throw();
        });

        test('should handle file reading errors', () => {
            existsSyncStub.returns(true);
            readFileSyncStub.throws(new Error('Permission denied'));
            
            expect(() => utilities.loadDataFromFile('test.json')).to.throw('Permission denied');
        });
    });

    suite('loadConfigData function', () => {
        let vscodeWorkspaceStub: any;
        let mockFileUri: vscode.Uri;

        setup(() => {
            mockFileUri = vscode.Uri.file(path.join('/test/workspace', configFileName));
            vscodeWorkspaceStub = {
                fs: {
                    stat: sandbox.stub(),
                    readFile: sandbox.stub()
                }
            };
            sandbox.stub(vscode.workspace, 'fs').value(vscodeWorkspaceStub.fs);
            sandbox.stub(vscode.Uri, 'joinPath').returns(mockFileUri);
        });

        test('should load valid config file', async () => {
            const configData = {
                submissionRoot: 'submissions',
                studentNameMapping: { 'student1': 'John Doe' }
            };
            
            vscodeWorkspaceStub.fs.stat.resolves();
            vscodeWorkspaceStub.fs.readFile.resolves(Buffer.from(JSON.stringify(configData)));
            
            const result = await utilities.loadConfigData();
            
            expect(result).to.deep.equal(configData);
            expect(gvQLC.state.studentNameMapping).to.deep.equal({ 'student1': 'John Doe' });
        });

        test('should handle missing config file', async () => {
            vscodeWorkspaceStub.fs.stat.rejects(new Error('File not found'));
            
            const result = await utilities.loadConfigData();
            
            expect(showErrorMessageStub.calledWith(
                'No config file found. Press Command + Shift + P and select "Create Sample Config File".'
            )).to.be.true;
            expect(result).to.deep.equal({});
        });

        test('should handle JSON parsing errors', async () => {
            vscodeWorkspaceStub.fs.stat.resolves();
            vscodeWorkspaceStub.fs.readFile.resolves(Buffer.from('invalid json'));
            
            const result = await utilities.loadConfigData();
            
            expect(showErrorMessageStub.called).to.be.true;
            expect(result).to.deep.equal({});
        });

        test('should handle config without studentNameMapping', async () => {
            const configData = { submissionRoot: 'submissions' };
            
            vscodeWorkspaceStub.fs.stat.resolves();
            vscodeWorkspaceStub.fs.readFile.resolves(Buffer.from(JSON.stringify(configData)));
            
            const result = await utilities.loadConfigData();
            
            expect(result.submissionRoot).to.equal('submissions');
            expect(gvQLC.state.studentNameMapping).to.deep.equal({});
        });
    });

    suite('ensureGitignoreForQuizQuestionsFile function', () => {
        let processEnvStub: sinon.SinonStub;

        setup(() => {
            processEnvStub = sandbox.stub(process, 'env').value({});
        });

        test('should create .gitignore if it does not exist', () => {
            existsSyncStub.returns(false);
            
            utilities.ensureGitignoreForQuizQuestionsFile();
            
            expect(writeFileSyncStub.calledWith(
                path.join('/test/workspace', '.gitignore'),
                `${quizQuestionsFileName}\n`
            )).to.be.true;
        });

        test('should add quiz file to existing .gitignore if not present', () => {
            const existingContent = 'node_modules/\n.env\n';
            existsSyncStub.returns(true);
            readFileSyncStub.returns(existingContent);
            
            utilities.ensureGitignoreForQuizQuestionsFile();
            
            const expectedContent = existingContent + `\n${quizQuestionsFileName}\n`;
            expect(writeFileSyncStub.calledWith(
                path.join('/test/workspace', '.gitignore'),
                expectedContent
            )).to.be.true;
        });

        test('should not modify .gitignore if quiz file already present', () => {
            const existingContent = `node_modules/\n${quizQuestionsFileName}\n.env\n`;
            existsSyncStub.returns(true);
            readFileSyncStub.returns(existingContent);
            
            utilities.ensureGitignoreForQuizQuestionsFile();
            
            expect(writeFileSyncStub.called).to.be.false;
        });

        test('should use .test_gitignore in test environment', () => {
            processEnvStub.value({ VSCODE_TEST_ZK: 'true' });
            existsSyncStub.returns(false);
            
            utilities.ensureGitignoreForQuizQuestionsFile();
            
            expect(writeFileSyncStub.calledWith(
                path.join('/test/workspace', '.test_gitignore'),
                `${quizQuestionsFileName}\n`
            )).to.be.true;
        });

        test('should use .test_gitignore in debug mode', () => {
            processEnvStub.value({ VSCODE_DEBUG_MODE: 'true' });
            existsSyncStub.returns(false);
            
            utilities.ensureGitignoreForQuizQuestionsFile();
            
            expect(writeFileSyncStub.calledWith(
                path.join('/test/workspace', '.test_gitignore'),
                `${quizQuestionsFileName}\n`
            )).to.be.true;
        });
    });

    suite('extractStudentName function', () => {
        test('should extract student name with submission root', () => {
            const filePath = '/workspace/submissions/john_doe/assignment1/main.js';
            const submissionRoot = 'submissions';
            
            const result = utilities.extractStudentName(filePath, submissionRoot);
            
            expect(result).to.equal('john_doe');
        });

        test('should extract student name without submission root', () => {
            const filePath = '/workspace/john_doe/assignment1/main.js';
            
            const result = utilities.extractStudentName(filePath, null);
            
            expect(result).to.equal('workspace');
        });

        test('should handle Windows-style paths', () => {
            const filePath = 'C:\\Users\\Workspace\\submissions\\jane_smith\\project\\app.js';
            const submissionRoot = 'submissions';
            
            const result = utilities.extractStudentName(filePath, submissionRoot);
            
            expect(result).to.equal('jane_smith');
        });

        test('should handle nested submission roots', () => {
            const filePath = '/workspace/fall2023/submissions/bob_wilson/hw1/code.py';
            const submissionRoot = 'submissions';
            
            const result = utilities.extractStudentName(filePath, submissionRoot);
            
            expect(result).to.equal('bob_wilson');
        });

        test('should handle missing submission root in path', () => {
            const filePath = '/workspace/student/assignment/file.js';
            const submissionRoot = 'nonexistent';
            
            const result = utilities.extractStudentName(filePath, submissionRoot);
            
            expect(result).to.be.undefined;
        });

        test('should handle empty path', () => {
            const result = utilities.extractStudentName('', 'submissions');
            
            expect(result).to.be.undefined;
        });

        test('should handle complex student names', () => {
            const filePath = '/workspace/submissions/student-with-dashes/project/main.cpp';
            const submissionRoot = 'submissions';
            
            const result = utilities.extractStudentName(filePath, submissionRoot);
            
            expect(result).to.equal('student-with-dashes');
        });
    });

    suite('loadPersistedData function', () => {
        let verifyAndSetWorkspaceRootStub: sinon.SinonStub;
        let loadDataFromFileStub: sinon.SinonStub;
        let ensureGitignoreStub: sinon.SinonStub;
        let logToFileStub: sinon.SinonStub;

        setup(() => {
            verifyAndSetWorkspaceRootStub = sandbox.stub().returns(true);
            loadDataFromFileStub = sandbox.stub(utilities, 'loadDataFromFile');
            ensureGitignoreStub = sandbox.stub(utilities, 'ensureGitignoreForQuizQuestionsFile');
            logToFileStub = sandbox.stub();
            
            // Mock the private function through the module
            (utilities as any).verifyAndSetWorkspaceRoot = verifyAndSetWorkspaceRootStub;
        });

        test('should load data successfully when workspace is valid', () => {
            loadDataFromFileStub.withArgs('commentsData.json').returns(['comment1']);
            loadDataFromFileStub.withArgs('questionsData.json').returns(['question1']);
            loadDataFromFileStub.withArgs(quizQuestionsFileName).returns(['personalizedQ1']);
            
            const result = utilities.loadPersistedData();
            
            expect(result).to.be.true;
            expect(gvQLC.state.commentsData).to.deep.equal(['comment1']);
            expect(gvQLC.state.questionsData).to.deep.equal(['question1']);
            expect(gvQLC.state.personalizedQuestionsData).to.deep.equal(['personalizedQ1']);
            expect(gvQLC.state.dataLoaded).to.be.true;
            expect(ensureGitignoreStub.called).to.be.true;
        });

        test('should return false when workspace verification fails', () => {
            verifyAndSetWorkspaceRootStub.returns(false);
            
            const result = utilities.loadPersistedData();
            
            expect(result).to.be.false;
            expect(loadDataFromFileStub.called).to.be.false;
            expect(gvQLC.state.dataLoaded).to.be.false;
        });

        test('should return true without reloading if data already loaded', () => {
            gvQLC.state.dataLoaded = true;
            
            const result = utilities.loadPersistedData();
            
            expect(result).to.be.true;
            expect(verifyAndSetWorkspaceRootStub.called).to.be.false;
            expect(loadDataFromFileStub.called).to.be.false;
        });

        test('should handle empty data files', () => {
            loadDataFromFileStub.returns([]);
            
            const result = utilities.loadPersistedData();
            
            expect(result).to.be.true;
            expect(gvQLC.state.commentsData).to.be.empty;
            expect(gvQLC.state.questionsData).to.be.empty;
            expect(gvQLC.state.personalizedQuestionsData).to.be.empty;
        });
    });

    suite('getAllStudentNames function', () => {
        let vscodeWorkspaceStub: any;
        let mockSubmissionUri: vscode.Uri;

        setup(() => {
            mockSubmissionUri = vscode.Uri.file('/test/workspace/submissions');
            vscodeWorkspaceStub = {
                fs: {
                    readDirectory: sandbox.stub()
                }
            };
            sandbox.stub(vscode.workspace, 'fs').value(vscodeWorkspaceStub.fs);
            sandbox.stub(vscode.Uri, 'joinPath').returns(mockSubmissionUri);
        });

        test('should return sorted student names from directories', async () => {
            const config: ConfigData = { submissionRoot: null, studentNameMapping: null };
            const mockDirectories: [string, vscode.FileType][] = [
                ['student_c', vscode.FileType.Directory],
                ['student_a', vscode.FileType.Directory],
                ['student_b', vscode.FileType.Directory],
                ['file.txt', vscode.FileType.File],
                ['.hidden', vscode.FileType.Directory]
            ];
            
            vscodeWorkspaceStub.fs.readDirectory.resolves(mockDirectories);
            
            const result = await utilities.getAllStudentNames(config);
            
            expect(result).to.deep.equal(['student_a', 'student_b', 'student_c']);
        });

        test('should filter out files and hidden directories', async () => {
            const config: ConfigData = { submissionRoot: null, studentNameMapping: null };
            const mockDirectories: [string, vscode.FileType][] = [
                ['john_doe', vscode.FileType.Directory],
                ['README.md', vscode.FileType.File],
                ['.git', vscode.FileType.Directory],
                ['jane_smith', vscode.FileType.Directory]
            ];
            
            vscodeWorkspaceStub.fs.readDirectory.resolves(mockDirectories);
            
            const result = await utilities.getAllStudentNames(config);
            
            expect(result).to.deep.equal(['jane_smith', 'john_doe']);
        });

        test('should use submission root when provided', async () => {
            const config: ConfigData = { submissionRoot: 'submissions', studentNameMapping: null };
            
            const result = await utilities.getAllStudentNames(config);
            
            expect((vscode.Uri.joinPath as sinon.SinonStub).calledWith(mockWorkspace.uri, 'submissions')).to.be.true;
        });

        test('should handle empty directory', async () => {
            const config: ConfigData = { submissionRoot: null, studentNameMapping: null };
            vscodeWorkspaceStub.fs.readDirectory.resolves([]);
            
            const result = await utilities.getAllStudentNames(config);
            
            expect(result).to.be.empty;
        });

        test('should handle directory read errors', async () => {
            const config: ConfigData = { submissionRoot: null, studentNameMapping: null };
            vscodeWorkspaceStub.fs.readDirectory.rejects(new Error('Permission denied'));
            
            try {
                await utilities.getAllStudentNames(config);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect((error as Error).message).to.equal('Permission denied');
            }
        });
    });

    suite('renderMustache function', () => {
        let mockContext: any;

        setup(() => {
            mockContext = { extensionPath: '/extension/path' };
            sandbox.stub(gvQLC, 'context').returns(mockContext);
        });

        test('should render template with data', () => {
            const templateContent = 'Hello {{name}}, you have {{count}} messages.';
            const templatePath = path.join('/extension/path', 'views', 'test.mustache');
            const data = { name: 'John', count: 5 };
            
            readFileSyncStub.withArgs(templatePath, 'utf8').returns(templateContent);
            sandbox.stub(Mustache, 'render').returns('Hello John, you have 5 messages.');
            
            const result = utilities.renderMustache('test.mustache', data);
            
            expect(readFileSyncStub.calledWith(templatePath, 'utf8')).to.be.true;
            expect(result).to.equal('Hello John, you have 5 messages.');
        });

        test('should handle template reading errors', () => {
            readFileSyncStub.throws(new Error('Template not found'));
            
            expect(() => utilities.renderMustache('nonexistent.mustache', {})).to.throw('Template not found');
        });

        test('should handle complex template data', () => {
            const templateContent = '{{#students}}{{name}}: {{grade}}{{/students}}';
            const data = {
                students: [
                    { name: 'Alice', grade: 'A' },
                    { name: 'Bob', grade: 'B' }
                ]
            };
            
            readFileSyncStub.returns(templateContent);
            sandbox.stub(Mustache, 'render').returns('Alice: ABob: B');
            
            const result = utilities.renderMustache('grades.mustache', data);
            
            expect(result).to.equal('Alice: ABob: B');
        });
    });

    suite('saveDataToFile function', () => {
        let vscodeWorkspaceStub: any;
        let mockFileUri: vscode.Uri;

        setup(() => {
            mockFileUri = vscode.Uri.file('/test/workspace/test.json');
            vscodeWorkspaceStub = {
                fs: {
                    writeFile: sandbox.stub()
                }
            };
            sandbox.stub(vscode.workspace, 'fs').value(vscodeWorkspaceStub.fs);
            sandbox.stub(vscode.Uri, 'file').returns(mockFileUri);
        });

        test('should save data as JSON by default', async () => {
            const testData = ['item1', 'item2'];
            
            await utilities.saveDataToFile('test.json', testData);
            
            expect(vscodeWorkspaceStub.fs.writeFile.called).to.be.true;
            const writtenData = JSON.parse(vscodeWorkspaceStub.fs.writeFile.firstCall.args[1].toString());
            expect(writtenData.data).to.deep.equal(testData);
            expect(writtenData).to.have.property('timestamp');
            expect(writtenData).to.have.property('uniqID');
        });

        test('should save raw data when useJSON is false', async () => {
            const testData = 'raw text data';
            
            await utilities.saveDataToFile('test.txt', testData, false);
            
            const writtenData = vscodeWorkspaceStub.fs.writeFile.firstCall.args[1].toString();
            expect(writtenData).to.equal(testData);
        });

        test('should handle no workspace error', async () => {
            sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
            
            await utilities.saveDataToFile('test.json', {});
            
            expect(showErrorMessageStub.calledWith('No workspace folder is open.')).to.be.true;
            expect(vscodeWorkspaceStub.fs.writeFile.called).to.be.false;
        });

        test('should include timestamp and unique ID in JSON output', async () => {
            const testData = { test: 'data' };
            
            await utilities.saveDataToFile('test.json', testData);
            
            const writtenData = JSON.parse(vscodeWorkspaceStub.fs.writeFile.firstCall.args[1].toString());
            expect(writtenData.timestamp).to.be.a('string');
            expect(writtenData.uniqID).to.be.a('number');
            expect(writtenData.data).to.deep.equal(testData);
        });

        test('should handle file write errors', async () => {
            vscodeWorkspaceStub.fs.writeFile.rejects(new Error('Write failed'));
            
            try {
                await utilities.saveDataToFile('test.json', {});
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect((error as Error).message).to.equal('Write failed');
            }
        });
    });

    suite('chooseQuestionColor function', () => {
        test('should return RED when no questions for student', () => {
            const result = utilities.chooseQuestionColor(0, 5);
            expect(result).to.equal(ViewColors.RED);
        });

        test('should return BLUE when student has more than mode questions', () => {
            const result = utilities.chooseQuestionColor(8, 5);
            expect(result).to.equal(ViewColors.BLUE);
        });

        test('should return GREEN when student has exactly mode questions', () => {
            const result = utilities.chooseQuestionColor(5, 5);
            expect(result).to.equal(ViewColors.GREEN);
        });

        test('should return YELLOW when student has fewer than mode questions', () => {
            const result = utilities.chooseQuestionColor(3, 5);
            expect(result).to.equal(ViewColors.YELLOW);
        });

        test('should handle edge case with mode of 0', () => {
            expect(utilities.chooseQuestionColor(0, 0)).to.equal(ViewColors.RED);
            expect(utilities.chooseQuestionColor(1, 0)).to.equal(ViewColors.BLUE);
        });

        test('should handle edge case with mode of 1', () => {
            expect(utilities.chooseQuestionColor(0, 1)).to.equal(ViewColors.RED);
            expect(utilities.chooseQuestionColor(1, 1)).to.equal(ViewColors.GREEN);
            expect(utilities.chooseQuestionColor(2, 1)).to.equal(ViewColors.BLUE);
        });

        test('should handle large numbers', () => {
            expect(utilities.chooseQuestionColor(1000, 500)).to.equal(ViewColors.BLUE);
            expect(utilities.chooseQuestionColor(500, 500)).to.equal(ViewColors.GREEN);
            expect(utilities.chooseQuestionColor(250, 500)).to.equal(ViewColors.YELLOW);
        });
    });

    suite('integration tests', () => {
        test('should work with complete data loading workflow', () => {
            // Setup successful data loading
            existsSyncStub.returns(true);
            readFileSyncStub.withArgs(path.join('/test/workspace', 'commentsData.json'), 'utf-8')
                .returns(JSON.stringify({ data: ['comment1'] }));
            readFileSyncStub.withArgs(path.join('/test/workspace', 'questionsData.json'), 'utf-8')
                .returns(JSON.stringify(['question1']));
            readFileSyncStub.withArgs(path.join('/test/workspace', quizQuestionsFileName), 'utf-8')
                .returns(JSON.stringify(['personalizedQ1']));
            
            const result = utilities.loadPersistedData();
            
            expect(result).to.be.true;
            expect(gvQLC.state.dataLoaded).to.be.true;
            expect(gvQLC.state.commentsData).to.deep.equal(['comment1']);
        });

        test('should handle complete workflow with file operations', async () => {
            const testData = ['test', 'data'];
            
            // Save data
            const vscodeWorkspaceStub = {
                fs: { writeFile: sandbox.stub().resolves() }
            };
            sandbox.stub(vscode.workspace, 'fs').value(vscodeWorkspaceStub.fs);
            
            await utilities.saveDataToFile('test.json', testData);
            
            expect(vscodeWorkspaceStub.fs.writeFile.called).to.be.true;
            
            // Load data back
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({ data: testData }));
            
            const loadedData = utilities.loadDataFromFile('test.json');
            expect(loadedData).to.deep.equal(testData);
        });

        test('should handle student name extraction in realistic scenarios', () => {
            const testCases = [
                {
                    path: '/workspace/fall2023/submissions/john_doe/hw1/main.py',
                    root: 'submissions',
                    expected: 'john_doe'
                },
                {
                    path: '/workspace/jane_smith/project/app.js',
                    root: null,
                    expected: 'workspace'
                },
                {
                    path: 'C:\\School\\submissions\\bob_wilson\\assignment\\code.cpp',
                    root: 'submissions',
                    expected: 'bob_wilson'
                }
            ];
            
            testCases.forEach(({ path, root, expected }) => {
                const result = utilities.extractStudentName(path, root);
                expect(result).to.equal(expected);
            });
        });
    });

    suite('error handling and edge cases', () => {
        test('should handle workspace operations with no workspace gracefully', () => {
            sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
            
            expect(() => utilities.getWorkspaceDirectory()).to.throw('No workspace folder found.');
        });

        test('should handle file system errors in data loading', () => {
            existsSyncStub.returns(true);
            readFileSyncStub.throws(new Error('File system error'));
            
            expect(() => utilities.loadDataFromFile('test.json')).to.throw('File system error');
        });

        test('should handle invalid JSON in data files', () => {
            existsSyncStub.returns(true);
            readFileSyncStub.returns('invalid json content');
            
            expect(() => utilities.loadDataFromFile('test.json')).to.throw();
        });

        test('should handle missing template files', () => {
            readFileSyncStub.throws(new Error('ENOENT: no such file or directory'));
            
            expect(() => utilities.renderMustache('missing.mustache', {})).to.throw('ENOENT');
        });

        test('should handle color calculation edge cases', () => {
            // Test boundary conditions
            expect(utilities.chooseQuestionColor(-1, 5)).to.equal(ViewColors.RED);
            expect(utilities.chooseQuestionColor(Number.MAX_SAFE_INTEGER, 5)).to.equal(ViewColors.BLUE);
            expect(utilities.chooseQuestionColor(5, Number.MAX_SAFE_INTEGER)).to.equal(ViewColors.YELLOW);
        });
    });
});