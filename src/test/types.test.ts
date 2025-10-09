import { expect } from 'chai';

import { PersonalizedQuestionsData, ConfigData } from '../types';

suite('Types Test Suite', () => {

    suite('PersonalizedQuestionsData interface', () => {
        test('should accept valid complete object', () => {
            const validData: PersonalizedQuestionsData = {
                filePath: '/test/file.js',
                text: 'What does this function do?',
                range: {
                    start: { line: 10, character: 5 },
                    end: { line: 12, character: 20 }
                },
                highlightedCode: 'function test() { return true; }',
                excludeFromQuiz: false
            };

            expect(validData).to.have.property('filePath').that.is.a('string');
            expect(validData).to.have.property('text').that.is.a('string');
            expect(validData).to.have.property('range').that.is.an('object');
            expect(validData).to.have.property('highlightedCode').that.is.a('string');
            expect(validData).to.have.property('excludeFromQuiz').that.is.a('boolean');
        });

        test('should have correct structure for filePath', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/absolute/path/to/file.ts',
                text: 'Question text',
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 10 }
                },
                highlightedCode: 'code',
                excludeFromQuiz: true
            };

            expect(data.filePath).to.be.a('string');
            expect(data.filePath).to.equal('/absolute/path/to/file.ts');
        });

        test('should have correct structure for text', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Explain what this code does in detail',
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 3, character: 15 }
                },
                highlightedCode: 'const x = 5;',
                excludeFromQuiz: false
            };

            expect(data.text).to.be.a('string');
            expect(data.text).to.equal('Explain what this code does in detail');
        });

        test('should have correct structure for range object', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: 5, character: 10 },
                    end: { line: 8, character: 25 }
                },
                highlightedCode: 'highlighted code',
                excludeFromQuiz: true
            };

            expect(data.range).to.be.an('object');
            expect(data.range).to.have.property('start').that.is.an('object');
            expect(data.range).to.have.property('end').that.is.an('object');
            
            expect(data.range.start).to.have.property('line').that.is.a('number');
            expect(data.range.start).to.have.property('character').that.is.a('number');
            expect(data.range.end).to.have.property('line').that.is.a('number');
            expect(data.range.end).to.have.property('character').that.is.a('number');
        });

        test('should handle zero values in range', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 }
                },
                highlightedCode: '',
                excludeFromQuiz: false
            };

            expect(data.range.start.line).to.equal(0);
            expect(data.range.start.character).to.equal(0);
            expect(data.range.end.line).to.equal(0);
            expect(data.range.end.character).to.equal(0);
        });

        test('should handle large values in range', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: 1000, character: 500 },
                    end: { line: 2000, character: 1000 }
                },
                highlightedCode: 'code',
                excludeFromQuiz: true
            };

            expect(data.range.start.line).to.equal(1000);
            expect(data.range.start.character).to.equal(500);
            expect(data.range.end.line).to.equal(2000);
            expect(data.range.end.character).to.equal(1000);
        });

        test('should have correct structure for highlightedCode', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 3, character: 10 }
                },
                highlightedCode: 'function example() {\n  return "hello";\n}',
                excludeFromQuiz: false
            };

            expect(data.highlightedCode).to.be.a('string');
            expect(data.highlightedCode).to.include('function example()');
        });

        test('should handle empty highlightedCode', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 0 }
                },
                highlightedCode: '',
                excludeFromQuiz: true
            };

            expect(data.highlightedCode).to.be.a('string');
            expect(data.highlightedCode).to.equal('');
        });

        test('should have correct structure for excludeFromQuiz boolean', () => {
            const dataTrue: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 10 }
                },
                highlightedCode: 'code',
                excludeFromQuiz: true
            };

            const dataFalse: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 10 }
                },
                highlightedCode: 'code',
                excludeFromQuiz: false
            };

            expect(dataTrue.excludeFromQuiz).to.be.a('boolean');
            expect(dataTrue.excludeFromQuiz).to.be.true;
            expect(dataFalse.excludeFromQuiz).to.be.a('boolean');
            expect(dataFalse.excludeFromQuiz).to.be.false;
        });

        test('should work with complex file paths', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/Users/student/Documents/projects/my-app/src/components/Button.tsx',
                text: 'Question about React component',
                range: {
                    start: { line: 15, character: 8 },
                    end: { line: 20, character: 2 }
                },
                highlightedCode: 'const Button = () => <button>Click me</button>',
                excludeFromQuiz: false
            };

            expect(data.filePath).to.include('Button.tsx');
            expect(data.filePath).to.include('/src/components/');
        });

        test('should work with Windows-style file paths', () => {
            const data: PersonalizedQuestionsData = {
                filePath: 'C:\\Users\\Student\\Code\\project\\src\\main.ts',
                text: 'TypeScript question',
                range: {
                    start: { line: 5, character: 0 },
                    end: { line: 8, character: 15 }
                },
                highlightedCode: 'interface User { name: string; }',
                excludeFromQuiz: true
            };

            expect(data.filePath).to.include('C:\\');
            expect(data.filePath).to.include('main.ts');
        });

        test('should handle special characters in text and code', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'What does this regex /[a-zA-Z0-9]+/ match? Explain the symbols: $, ^, &, |',
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 30 }
                },
                highlightedCode: 'const regex = /[a-zA-Z0-9]+/g;\nconsole.log("Test & validation");',
                excludeFromQuiz: false
            };

            expect(data.text).to.include('/[a-zA-Z0-9]+/');
            expect(data.text).to.include('$, ^, &, |');
            expect(data.highlightedCode).to.include('&');
        });
    });

    suite('ConfigData interface', () => {
        test('should accept valid complete object with string submissionRoot', () => {
            const config: ConfigData = {
                submissionRoot: 'submissions',
                studentNameMapping: {
                    'student1': 'John Doe',
                    'student2': 'Jane Smith'
                }
            };

            expect(config).to.have.property('submissionRoot').that.is.a('string');
            expect(config).to.have.property('studentNameMapping').that.is.an('object');
        });

        test('should accept valid object with null submissionRoot', () => {
            const config: ConfigData = {
                submissionRoot: null,
                studentNameMapping: {
                    'user123': 'Alice Johnson'
                }
            };

            expect(config.submissionRoot).to.be.null;
            expect(config.studentNameMapping).to.be.an('object');
        });

        test('should accept valid object with null studentNameMapping', () => {
            const config: ConfigData = {
                submissionRoot: 'student-work',
                studentNameMapping: null
            };

            expect(config.submissionRoot).to.equal('student-work');
            expect(config.studentNameMapping).to.be.null;
        });

        test('should accept object with both properties null', () => {
            const config: ConfigData = {
                submissionRoot: null,
                studentNameMapping: null
            };

            expect(config.submissionRoot).to.be.null;
            expect(config.studentNameMapping).to.be.null;
        });

        test('should handle empty studentNameMapping object', () => {
            const config: ConfigData = {
                submissionRoot: 'assignments',
                studentNameMapping: {}
            };

            expect(config.studentNameMapping).to.be.an('object');
            expect(Object.keys(config.studentNameMapping || {})).to.have.length(0);
        });

        test('should handle complex studentNameMapping', () => {
            const config: ConfigData = {
                submissionRoot: 'homework',
                studentNameMapping: {
                    'jdoe123': 'John Doe',
                    'jsmith456': 'Jane Smith',
                    'bwilson789': 'Bob Wilson',
                    'agarcia012': 'Ana Garcia',
                    'user_with_underscores': 'Test User'
                }
            };

            expect(config.studentNameMapping).to.be.an('object');
            expect(Object.keys(config.studentNameMapping || {})).to.have.length(5);
            expect(config.studentNameMapping!['jdoe123']).to.equal('John Doe');
            expect(config.studentNameMapping!['user_with_underscores']).to.equal('Test User');
        });

        test('should handle different submissionRoot formats', () => {
            const configs = [
                { submissionRoot: 'submissions', studentNameMapping: null },
                { submissionRoot: 'student_work', studentNameMapping: null },
                { submissionRoot: 'assignments/fall2023', studentNameMapping: null },
                { submissionRoot: 'homework-submissions', studentNameMapping: null }
            ];

            configs.forEach(config => {
                expect(config.submissionRoot).to.be.a('string');
                expect(config.studentNameMapping).to.be.null;
            });
        });

        test('should handle special characters in student names', () => {
            const config: ConfigData = {
                submissionRoot: 'submissions',
                studentNameMapping: {
                    'user1': 'José María González',
                    'user2': 'François Müller',
                    'user3': '李小明',
                    'user4': "O'Connor, Patrick",
                    'user5': 'Smith-Johnson, Mary'
                }
            };

            expect(config.studentNameMapping!['user1']).to.include('José');
            expect(config.studentNameMapping!['user2']).to.include('François');
            expect(config.studentNameMapping!['user3']).to.equal('李小明');
            expect(config.studentNameMapping!['user4']).to.include("O'Connor");
            expect(config.studentNameMapping!['user5']).to.include('Smith-Johnson');
        });

        test('should handle numeric-like string keys in studentNameMapping', () => {
            const config: ConfigData = {
                submissionRoot: 'class',
                studentNameMapping: {
                    '123': 'Student 123',
                    '456': 'Student 456',
                    '001': 'Student 001'
                }
            };

            expect(config.studentNameMapping!['123']).to.equal('Student 123');
            expect(config.studentNameMapping!['456']).to.equal('Student 456');
            expect(config.studentNameMapping!['001']).to.equal('Student 001');
        });

        test('should maintain type safety for Record<string, string>', () => {
            const mapping: Record<string, string> = {
                'key1': 'value1',
                'key2': 'value2'
            };

            const config: ConfigData = {
                submissionRoot: 'test',
                studentNameMapping: mapping
            };

            expect(config.studentNameMapping).to.equal(mapping);
            // All values should be strings
            if (config.studentNameMapping) {
                Object.values(config.studentNameMapping).forEach(value => {
                    expect(value).to.be.a('string');
                });
            }
        });
    });

    suite('Type compatibility and relationships', () => {
        test('should work together in realistic scenarios', () => {
            const config: ConfigData = {
                submissionRoot: 'assignments/project1',
                studentNameMapping: {
                    'jdoe': 'John Doe',
                    'jsmith': 'Jane Smith'
                }
            };

            const question: PersonalizedQuestionsData = {
                filePath: '/assignments/project1/jdoe/main.js',
                text: 'Explain the purpose of this function for John Doe',
                range: {
                    start: { line: 15, character: 0 },
                    end: { line: 20, character: 10 }
                },
                highlightedCode: 'function calculateGrade(score) { return score >= 60 ? "Pass" : "Fail"; }',
                excludeFromQuiz: false
            };

            // Verify the question relates to the config
            expect(question.filePath).to.include(config.submissionRoot!);
            expect(question.filePath).to.include('jdoe');
            expect(question.text).to.include('John Doe');
        });

        test('should handle arrays of PersonalizedQuestionsData', () => {
            const questions: PersonalizedQuestionsData[] = [
                {
                    filePath: '/test1.js',
                    text: 'Question 1',
                    range: { start: { line: 1, character: 0 }, end: { line: 2, character: 5 } },
                    highlightedCode: 'code1',
                    excludeFromQuiz: false
                },
                {
                    filePath: '/test2.js',
                    text: 'Question 2',
                    range: { start: { line: 3, character: 2 }, end: { line: 4, character: 8 } },
                    highlightedCode: 'code2',
                    excludeFromQuiz: true
                }
            ];

            expect(questions).to.have.length(2);
            expect(questions[0].excludeFromQuiz).to.be.false;
            expect(questions[1].excludeFromQuiz).to.be.true;
        });

        test('should support optional properties pattern', () => {
            // Test that interfaces can be extended conceptually
            interface ExtendedConfigData extends ConfigData {
                version?: string;
                lastModified?: Date;
            }

            const extendedConfig: ExtendedConfigData = {
                submissionRoot: 'hw1',
                studentNameMapping: { 'test': 'Test User' },
                version: '1.0.0'
            };

            expect(extendedConfig).to.have.property('submissionRoot', 'hw1');
            expect(extendedConfig).to.have.property('version', '1.0.0');
        });
    });

    suite('Edge cases and validation', () => {
        test('should handle very long strings in PersonalizedQuestionsData', () => {
            const longText = 'a'.repeat(10000);
            const longCode = 'console.log("' + 'x'.repeat(5000) + '");';

            const data: PersonalizedQuestionsData = {
                filePath: '/very/long/path/' + 'folder/'.repeat(100) + 'file.js',
                text: longText,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 100, character: 50 }
                },
                highlightedCode: longCode,
                excludeFromQuiz: false
            };

            expect(data.text).to.have.length(10000);
            expect(data.highlightedCode).to.include('console.log');
            expect(data.filePath).to.include('folder/');
        });

        test('should handle empty strings in ConfigData', () => {
            const config: ConfigData = {
                submissionRoot: '',
                studentNameMapping: {
                    '': '',
                    'user': ''
                }
            };

            expect(config.submissionRoot).to.equal('');
            expect(config.studentNameMapping!['user']).to.equal('');
        });

        test('should handle negative line numbers in range (edge case)', () => {
            const data: PersonalizedQuestionsData = {
                filePath: '/test.js',
                text: 'Question',
                range: {
                    start: { line: -1, character: -1 },
                    end: { line: 0, character: 0 }
                },
                highlightedCode: 'code',
                excludeFromQuiz: true
            };

            expect(data.range.start.line).to.equal(-1);
            expect(data.range.start.character).to.equal(-1);
        });

        test('should maintain data integrity in collections', () => {
            const configs: ConfigData[] = [
                { submissionRoot: 'hw1', studentNameMapping: null },
                { submissionRoot: null, studentNameMapping: { 'a': 'A' } },
                { submissionRoot: 'hw2', studentNameMapping: { 'b': 'B' } }
            ];

            expect(configs[0].submissionRoot).to.equal('hw1');
            expect(configs[1].submissionRoot).to.be.null;
            expect(configs[2].studentNameMapping!['b']).to.equal('B');
        });
    });
});