import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import * as gvQLC from '../gvQLC';
import { PersonalizedQuestionsData, ConfigData } from '../types';
import * as utilities from '../utilities';

suite('gvQLC Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let loadConfigDataStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        loadConfigDataStub = sandbox.stub(utilities, 'loadConfigData');
        
        // Reset the module state before each test
        gvQLC.state.commentsData = [];
        gvQLC.state.questionsData = [];
        gvQLC.state.personalizedQuestionsData = [];
        gvQLC.state.dataLoaded = false;
        gvQLC.state.modalErrorDisplayed = false;
        gvQLC.state.studentNameMapping = {};
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('state object', () => {
        test('should have correct initial structure', () => {
            expect(gvQLC.state).to.have.property('commentsData').that.is.an('array');
            expect(gvQLC.state).to.have.property('questionsData').that.is.an('array');
            expect(gvQLC.state).to.have.property('personalizedQuestionsData').that.is.an('array');
            expect(gvQLC.state).to.have.property('dataLoaded').that.is.a('boolean');
            expect(gvQLC.state).to.have.property('modalErrorDisplayed').that.is.a('boolean');
            expect(gvQLC.state).to.have.property('studentNameMapping').that.is.an('object');
        });

        test('should have empty arrays initially', () => {
            expect(gvQLC.state.commentsData).to.be.empty;
            expect(gvQLC.state.questionsData).to.be.empty;
            expect(gvQLC.state.personalizedQuestionsData).to.be.empty;
        });

        test('should have false boolean flags initially', () => {
            expect(gvQLC.state.dataLoaded).to.be.false;
            expect(gvQLC.state.modalErrorDisplayed).to.be.false;
        });

        test('should have empty studentNameMapping initially', () => {
            expect(gvQLC.state.studentNameMapping).to.be.empty;
        });

        test('should allow adding data to arrays', () => {
            const sampleComment = { id: 1, text: 'test comment' };
            const sampleQuestion = { id: 1, text: 'test question' };
            const samplePersonalizedQuestion: PersonalizedQuestionsData = {
                filePath: '/test/file.js',
                text: 'test question',
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 10 }
                },
                highlightedCode: 'test code',
                excludeFromQuiz: false
            };

            gvQLC.state.commentsData.push(sampleComment);
            gvQLC.state.questionsData.push(sampleQuestion);
            gvQLC.state.personalizedQuestionsData.push(samplePersonalizedQuestion);

            expect(gvQLC.state.commentsData).to.have.length(1);
            expect(gvQLC.state.questionsData).to.have.length(1);
            expect(gvQLC.state.personalizedQuestionsData).to.have.length(1);
        });

        test('should allow updating boolean flags', () => {
            gvQLC.state.dataLoaded = true;
            gvQLC.state.modalErrorDisplayed = true;

            expect(gvQLC.state.dataLoaded).to.be.true;
            expect(gvQLC.state.modalErrorDisplayed).to.be.true;
        });

        test('should allow updating studentNameMapping', () => {
            gvQLC.state.studentNameMapping = { 'student1': 'John Doe', 'student2': 'Jane Smith' };

            expect(gvQLC.state.studentNameMapping).to.have.property('student1', 'John Doe');
            expect(gvQLC.state.studentNameMapping).to.have.property('student2', 'Jane Smith');
        });
    });

    suite('context management', () => {
        test('should throw error when context not initialized', () => {
            expect(() => gvQLC.context()).to.throw('Extension context has not been initialized yet!');
        });

        test('should set and return context correctly', () => {
            const mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
            
            gvQLC.setContext(mockContext);
            
            expect(gvQLC.context()).to.equal(mockContext);
        });

        test('should handle multiple context sets', () => {
            const mockContext1 = { subscriptions: [], id: 1 } as any;
            const mockContext2 = { subscriptions: [], id: 2 } as any;
            
            gvQLC.setContext(mockContext1);
            expect(gvQLC.context()).to.equal(mockContext1);
            
            gvQLC.setContext(mockContext2);
            expect(gvQLC.context()).to.equal(mockContext2);
        });

        test('should allow setting context to undefined and throw on access', () => {
            const mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
            gvQLC.setContext(mockContext);
            
            // Set to null to simulate uninitialized state
            gvQLC.setContext(null as any);
            
            expect(() => gvQLC.context()).to.throw('Extension context has not been initialized yet!');
        });
    });

    suite('workspace root management', () => {
        test('should throw error when workspace root not initialized', () => {
            expect(() => gvQLC.workspaceRoot()).to.throw('Extension context has not been initialized yet!');
        });

        test('should set and return workspace root correctly', () => {
            const mockWorkspaceFolder = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            } as vscode.WorkspaceFolder;
            
            gvQLC.setWorkspaceRoot(mockWorkspaceFolder);
            
            expect(gvQLC.workspaceRoot()).to.equal(mockWorkspaceFolder);
        });

        test('should handle multiple workspace root sets', () => {
            const mockWorkspace1 = {
                uri: { fsPath: '/test/workspace1' },
                name: 'workspace1',
                index: 0
            } as vscode.WorkspaceFolder;
            
            const mockWorkspace2 = {
                uri: { fsPath: '/test/workspace2' },
                name: 'workspace2',
                index: 0
            } as vscode.WorkspaceFolder;
            
            gvQLC.setWorkspaceRoot(mockWorkspace1);
            expect(gvQLC.workspaceRoot()).to.equal(mockWorkspace1);
            
            gvQLC.setWorkspaceRoot(mockWorkspace2);
            expect(gvQLC.workspaceRoot()).to.equal(mockWorkspace2);
        });

        test('should allow setting workspace root to null and throw on access', () => {
            const mockWorkspace = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            } as vscode.WorkspaceFolder;
            
            gvQLC.setWorkspaceRoot(mockWorkspace);
            
            // Set to null to simulate uninitialized state
            gvQLC.setWorkspaceRoot(null as any);
            
            expect(() => gvQLC.workspaceRoot()).to.throw('Extension context has not been initialized yet!');
        });
    });

    suite('config management', () => {
        test('should load config data on first call', async () => {
            const mockConfig: ConfigData = {
                submissionRoot: 'submissions',
                studentNameMapping: { 'student1': 'John Doe' }
            };
            
            loadConfigDataStub.resolves(mockConfig);
            
            const result = await gvQLC.config();
            
            expect(loadConfigDataStub.calledOnce).to.be.true;
            expect(result).to.equal(mockConfig);
        });

        test('should return cached config on subsequent calls', async () => {
            const mockConfig: ConfigData = {
                submissionRoot: 'submissions',
                studentNameMapping: { 'student1': 'John Doe' }
            };
            
            loadConfigDataStub.resolves(mockConfig);
            
            const result1 = await gvQLC.config();
            const result2 = await gvQLC.config();
            
            expect(loadConfigDataStub.calledOnce).to.be.true;
            expect(result1).to.equal(mockConfig);
            expect(result2).to.equal(mockConfig);
            expect(result1).to.equal(result2);
        });

        test('should handle loadConfigData errors', async () => {
            const error = new Error('Config load failed');
            loadConfigDataStub.rejects(error);
            
            try {
                await gvQLC.config();
                expect.fail('Should have thrown an error');
            } catch (e) {
                expect(e).to.equal(error);
                expect(loadConfigDataStub.calledOnce).to.be.true;
            }
        });

        test('should handle empty config data', async () => {
            const emptyConfig: ConfigData = {
                submissionRoot: null,
                studentNameMapping: null
            };
            
            loadConfigDataStub.resolves(emptyConfig);
            
            const result = await gvQLC.config();
            
            expect(result).to.deep.equal(emptyConfig);
            expect(result.submissionRoot).to.be.null;
            expect(result.studentNameMapping).to.be.null;
        });

        test('should handle config with valid submission root', async () => {
            const configWithRoot: ConfigData = {
                submissionRoot: 'student-submissions',
                studentNameMapping: {}
            };
            
            loadConfigDataStub.resolves(configWithRoot);
            
            const result = await gvQLC.config();
            
            expect(result.submissionRoot).to.equal('student-submissions');
            expect(result.studentNameMapping).to.deep.equal({});
        });

        test('should handle config with student name mapping', async () => {
            const configWithMapping: ConfigData = {
                submissionRoot: null,
                studentNameMapping: {
                    'jdoe': 'John Doe',
                    'jsmith': 'Jane Smith',
                    'student123': 'Bob Johnson'
                }
            };
            
            loadConfigDataStub.resolves(configWithMapping);
            
            const result = await gvQLC.config();
            
            expect(result.studentNameMapping).to.deep.equal({
                'jdoe': 'John Doe',
                'jsmith': 'Jane Smith',
                'student123': 'Bob Johnson'
            });
        });
    });

    suite('integration tests', () => {
        test('should work with context and workspace root together', () => {
            const mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
            const mockWorkspace = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            } as vscode.WorkspaceFolder;
            
            gvQLC.setContext(mockContext);
            gvQLC.setWorkspaceRoot(mockWorkspace);
            
            expect(gvQLC.context()).to.equal(mockContext);
            expect(gvQLC.workspaceRoot()).to.equal(mockWorkspace);
        });

        test('should handle state modifications with config loading', async () => {
            const mockConfig: ConfigData = {
                submissionRoot: 'submissions',
                studentNameMapping: { 'test': 'Test User' }
            };
            
            loadConfigDataStub.resolves(mockConfig);
            
            // Modify state
            gvQLC.state.dataLoaded = true;
            gvQLC.state.modalErrorDisplayed = true;
            
            // Load config
            const config = await gvQLC.config();
            
            expect(config).to.equal(mockConfig);
            expect(gvQLC.state.dataLoaded).to.be.true;
            expect(gvQLC.state.modalErrorDisplayed).to.be.true;
        });

        test('should maintain independence between context, workspace, and config', async () => {
            const mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
            const mockWorkspace = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            } as vscode.WorkspaceFolder;
            const mockConfig: ConfigData = {
                submissionRoot: 'submissions',
                studentNameMapping: {}
            };
            
            loadConfigDataStub.resolves(mockConfig);
            
            // Set each independently
            gvQLC.setContext(mockContext);
            gvQLC.setWorkspaceRoot(mockWorkspace);
            const config = await gvQLC.config();
            
            // Verify they don't interfere with each other
            expect(gvQLC.context()).to.equal(mockContext);
            expect(gvQLC.workspaceRoot()).to.equal(mockWorkspace);
            expect(config).to.equal(mockConfig);
        });
    });

    suite('error handling', () => {
        test('should handle context access without initialization gracefully', () => {
            expect(() => gvQLC.context()).to.throw('Extension context has not been initialized yet!');
            
            // State should remain unaffected
            expect(gvQLC.state.commentsData).to.be.empty;
            expect(gvQLC.state.dataLoaded).to.be.false;
        });

        test('should handle workspace root access without initialization gracefully', () => {
            expect(() => gvQLC.workspaceRoot()).to.throw('Extension context has not been initialized yet!');
            
            // State should remain unaffected
            expect(gvQLC.state.personalizedQuestionsData).to.be.empty;
            expect(gvQLC.state.modalErrorDisplayed).to.be.false;
        });

        test('should handle config loading failures without affecting other components', async () => {
            const mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
            const mockWorkspace = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            } as vscode.WorkspaceFolder;
            
            loadConfigDataStub.rejects(new Error('Config load failed'));
            
            gvQLC.setContext(mockContext);
            gvQLC.setWorkspaceRoot(mockWorkspace);
            
            try {
                await gvQLC.config();
                expect.fail('Should have thrown an error');
            } catch (e) {
                // Context and workspace should still work
                expect(gvQLC.context()).to.equal(mockContext);
                expect(gvQLC.workspaceRoot()).to.equal(mockWorkspace);
            }
        });
    });
});