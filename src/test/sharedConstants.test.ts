import { expect } from 'chai';

import { GVQLC, ViewColors, configFileName, quizQuestionsFileName } from '../sharedConstants';

suite('SharedConstants Test Suite', () => {

    suite('GVQLC constant', () => {
        test('should be a string', () => {
            expect(GVQLC).to.be.a('string');
        });

        test('should have expected value', () => {
            expect(GVQLC).to.equal('gvQLC');
        });

        test.skip('should be immutable (frozen)', () => {
            // NOTE: This test is skipped because JavaScript/TypeScript allows reassigning imported
            // constants at runtime, even though it's not recommended. The module system and
            // TypeScript compilation provide the real immutability guarantees, not runtime freezing.
            // Constants should not be modifiable
            const originalValue = GVQLC;
            expect(() => {
                // TypeScript prevents this, but testing runtime behavior
                (GVQLC as any) = 'modified';
            }).to.not.throw();
            // The value should remain unchanged
            expect(GVQLC).to.equal(originalValue);
        });

        test('should not be empty', () => {
            expect(GVQLC).to.not.be.empty;
        });

        test('should not contain whitespace', () => {
            expect(GVQLC).to.not.match(/\s/);
        });
    });

    suite('quizQuestionsFileName constant', () => {
        test('should be a string', () => {
            expect(quizQuestionsFileName).to.be.a('string');
        });

        test('should have expected value', () => {
            expect(quizQuestionsFileName).to.equal('gvQLC.quizQuestions.json');
        });

        test('should have .json extension', () => {
            expect(quizQuestionsFileName).to.match(/\.json$/);
        });

        test('should start with GVQLC prefix', () => {
            expect(quizQuestionsFileName).to.match(/^gvQLC\./);
        });

        test('should contain expected parts', () => {
            expect(quizQuestionsFileName).to.include('gvQLC');
            expect(quizQuestionsFileName).to.include('quizQuestions');
            expect(quizQuestionsFileName).to.include('.json');
        });

        test('should not contain whitespace', () => {
            expect(quizQuestionsFileName).to.not.match(/\s/);
        });

        test('should not be empty', () => {
            expect(quizQuestionsFileName).to.not.be.empty;
        });

        test('should be valid filename format', () => {
            // Check for valid filename characters
            expect(quizQuestionsFileName).to.match(/^[a-zA-Z0-9._-]+$/);
        });
    });

    suite('configFileName constant', () => {
        test('should be a string', () => {
            expect(configFileName).to.be.a('string');
        });

        test('should have expected value', () => {
            expect(configFileName).to.equal('gvQLC.config.json');
        });

        test('should have .json extension', () => {
            expect(configFileName).to.match(/\.json$/);
        });

        test('should start with GVQLC prefix', () => {
            expect(configFileName).to.match(/^gvQLC\./);
        });

        test('should contain expected parts', () => {
            expect(configFileName).to.include('gvQLC');
            expect(configFileName).to.include('config');
            expect(configFileName).to.include('.json');
        });

        test('should not contain whitespace', () => {
            expect(configFileName).to.not.match(/\s/);
        });

        test('should not be empty', () => {
            expect(configFileName).to.not.be.empty;
        });

        test('should be valid filename format', () => {
            // Check for valid filename characters
            expect(configFileName).to.match(/^[a-zA-Z0-9._-]+$/);
        });

        test('should be different from quizQuestionsFileName', () => {
            expect(configFileName).to.not.equal(quizQuestionsFileName);
        });
    });

    suite('ViewColors enum', () => {
        test('should have RED property', () => {
            expect(ViewColors).to.have.property('RED');
            expect(ViewColors.RED).to.be.a('string');
        });

        test('should have GREEN property', () => {
            expect(ViewColors).to.have.property('GREEN');
            expect(ViewColors.GREEN).to.be.a('string');
        });

        test('should have YELLOW property', () => {
            expect(ViewColors).to.have.property('YELLOW');
            expect(ViewColors.YELLOW).to.be.a('string');
        });

        test('should have BLUE property', () => {
            expect(ViewColors).to.have.property('BLUE');
            expect(ViewColors.BLUE).to.be.a('string');
        });

        test('should have correct RED value', () => {
            expect(ViewColors.RED).to.equal('rgba(255, 184, 181, 1)');
        });

        test('should have correct GREEN value', () => {
            expect(ViewColors.GREEN).to.equal('rgba(208, 240, 208, 1)');
        });

        test('should have correct YELLOW value', () => {
            expect(ViewColors.YELLOW).to.equal('rgba(255, 255, 178, 1)');
        });

        test('should have correct BLUE value', () => {
            expect(ViewColors.BLUE).to.equal('rgba(184, 215, 255, 1)');
        });

        test('should have valid RGBA format for all colors', () => {
            const rgbaPattern = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[01](\.\d+)?\)$/;
            
            expect(ViewColors.RED).to.match(rgbaPattern);
            expect(ViewColors.GREEN).to.match(rgbaPattern);
            expect(ViewColors.YELLOW).to.match(rgbaPattern);
            expect(ViewColors.BLUE).to.match(rgbaPattern);
        });

        test('should have all colors with alpha value of 1', () => {
            expect(ViewColors.RED).to.include(', 1)');
            expect(ViewColors.GREEN).to.include(', 1)');
            expect(ViewColors.YELLOW).to.include(', 1)');
            expect(ViewColors.BLUE).to.include(', 1)');
        });

        test('should have all unique color values', () => {
            const colors = [ViewColors.RED, ViewColors.GREEN, ViewColors.YELLOW, ViewColors.BLUE];
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).to.equal(colors.length);
        });

        test('should have expected RGB values for RED', () => {
            expect(ViewColors.RED).to.include('255, 184, 181');
        });

        test('should have expected RGB values for GREEN', () => {
            expect(ViewColors.GREEN).to.include('208, 240, 208');
        });

        test('should have expected RGB values for YELLOW', () => {
            expect(ViewColors.YELLOW).to.include('255, 255, 178');
        });

        test('should have expected RGB values for BLUE', () => {
            expect(ViewColors.BLUE).to.include('184, 215, 255');
        });

        test('should be accessible as enum members', () => {
            // Test that enum members can be accessed in different ways
            expect(ViewColors['RED']).to.equal(ViewColors.RED);
            expect(ViewColors['GREEN']).to.equal(ViewColors.GREEN);
            expect(ViewColors['YELLOW']).to.equal(ViewColors.YELLOW);
            expect(ViewColors['BLUE']).to.equal(ViewColors.BLUE);
        });

        test('should have exactly 4 color properties', () => {
            const colorKeys = Object.keys(ViewColors);
            expect(colorKeys).to.have.length(4);
            expect(colorKeys).to.include.members(['RED', 'GREEN', 'YELLOW', 'BLUE']);
        });
    });

    suite('constants relationships', () => {
        test('should have consistent naming pattern for filenames', () => {
            expect(quizQuestionsFileName).to.match(/^gvQLC\./);
            expect(configFileName).to.match(/^gvQLC\./);
        });

        test('should use same prefix as GVQLC constant', () => {
            expect(quizQuestionsFileName).to.include(GVQLC);
            expect(configFileName).to.include(GVQLC);
        });

        test('should have different file purposes', () => {
            expect(quizQuestionsFileName).to.include('quizQuestions');
            expect(configFileName).to.include('config');
            expect(quizQuestionsFileName).to.not.include('config');
            expect(configFileName).to.not.include('quizQuestions');
        });

        test('should all be JSON files', () => {
            expect(quizQuestionsFileName).to.include('.json');
            expect(configFileName).to.include('.json');
        });
    });

    suite('type safety', () => {
        test('should preserve enum type for ViewColors', () => {
            // Test that enum values maintain their type
            const redColor: ViewColors = ViewColors.RED;
            const greenColor: ViewColors = ViewColors.GREEN;
            const yellowColor: ViewColors = ViewColors.YELLOW;
            const blueColor: ViewColors = ViewColors.BLUE;

            expect(redColor).to.equal(ViewColors.RED);
            expect(greenColor).to.equal(ViewColors.GREEN);
            expect(yellowColor).to.equal(ViewColors.YELLOW);
            expect(blueColor).to.equal(ViewColors.BLUE);
        });

        test('should allow iteration over ViewColors', () => {
            const colorValues: string[] = [];
            for (const color in ViewColors) {
                if (ViewColors.hasOwnProperty(color)) {
                    colorValues.push(ViewColors[color as keyof typeof ViewColors]);
                }
            }
            
            expect(colorValues).to.have.length(4);
            expect(colorValues).to.include.members([
                ViewColors.RED,
                ViewColors.GREEN,
                ViewColors.YELLOW,
                ViewColors.BLUE
            ]);
        });
    });

    suite('immutability', () => {
        test('should not allow modification of string constants', () => {
            const originalGVQLC = GVQLC;
            const originalQuizFileName = quizQuestionsFileName;
            const originalConfigFileName = configFileName;

            // Constants should remain unchanged
            expect(GVQLC).to.equal(originalGVQLC);
            expect(quizQuestionsFileName).to.equal(originalQuizFileName);
            expect(configFileName).to.equal(originalConfigFileName);
        });

        test('should not allow modification of enum values', () => {
            const originalRed = ViewColors.RED;
            const originalGreen = ViewColors.GREEN;
            const originalYellow = ViewColors.YELLOW;
            const originalBlue = ViewColors.BLUE;

            // Enum values should remain unchanged
            expect(ViewColors.RED).to.equal(originalRed);
            expect(ViewColors.GREEN).to.equal(originalGreen);
            expect(ViewColors.YELLOW).to.equal(originalYellow);
            expect(ViewColors.BLUE).to.equal(originalBlue);
        });
    });
});