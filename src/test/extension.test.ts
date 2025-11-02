import { expect } from 'chai';
import * as sinon from 'sinon';

// Import the functions we want to test
import { activate, deactivate } from '../extension';
import * as gvQLC from '../gvQLC';

suite('Extension Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: any; // Using any to avoid complex VS Code type issues
    let setContextSpy: sinon.SinonSpy;
    let consoleLogSpy: sinon.SinonSpy;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Create a simple mock extension context
        mockContext = {
            subscriptions: []
        };

        // Spy on setContext from gvQLC
        setContextSpy = sandbox.spy(gvQLC, 'setContext');
        
        // Spy on console.log
        consoleLogSpy = sandbox.spy(console, 'log');
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('activate function', () => {
        test('should log activation message', () => {
            activate(mockContext);
            
            expect(consoleLogSpy.calledWith('Congratulations, your extension "gvqlc" is now active!')).to.be.true;
        });

        test('should call setContext with the provided context', () => {
            activate(mockContext);
            
            expect(setContextSpy.calledOnceWith(mockContext)).to.be.true;
        });

        test('should add commands to context subscriptions', () => {
            activate(mockContext);
            
            expect(mockContext.subscriptions).to.have.length(3);
        });

        test('should handle context with existing subscriptions', () => {
            const existingSubscription = { dispose: sandbox.stub() };
            mockContext.subscriptions = [existingSubscription];
            
            activate(mockContext);
            
            expect(mockContext.subscriptions).to.have.length(4);
            expect(mockContext.subscriptions[0]).to.equal(existingSubscription);
        });

        test('should call setContext before adding subscriptions', () => {
            const subscriptionsPushSpy = sandbox.spy(mockContext.subscriptions, 'push');
            
            activate(mockContext);
            
            // Verify setContext was called before subscriptions.push
            expect(setContextSpy.calledBefore(subscriptionsPushSpy)).to.be.true;
        });

        test('should handle context gracefully', () => {
            // Test that activation works with a valid context
            const result = activate(mockContext);
            
            expect(result).to.be.undefined;
            expect(mockContext.subscriptions).to.have.length(3);
        });
    });

    suite('deactivate function', () => {
        test('should execute without errors', () => {
            expect(() => deactivate()).to.not.throw();
        });

        test('should return undefined', () => {
            const result = deactivate();
            expect(result).to.be.undefined;
        });
    });

    suite('integration tests', () => {
        test('should properly initialize extension state', () => {
            // Reset any previous calls
            setContextSpy.resetHistory();
            consoleLogSpy.resetHistory();
            
            activate(mockContext);
            
            // Verify all initialization steps
            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(setContextSpy.calledOnce).to.be.true;
            expect(mockContext.subscriptions).to.have.length(3);
            
            // Verify the order of operations
            expect(consoleLogSpy.calledBefore(setContextSpy)).to.be.true;
        });

        test('should handle activation and deactivation cycle', () => {
            activate(mockContext);
            const initialSubscriptions = mockContext.subscriptions.length;
            
            deactivate();
            
            // Deactivate doesn't modify subscriptions, but should not error
            expect(mockContext.subscriptions).to.have.length(initialSubscriptions);
        });

        test('should work with multiple activation calls', () => {
            activate(mockContext);
            const firstCallSubscriptions = mockContext.subscriptions.length;
            
            activate(mockContext);
            const secondCallSubscriptions = mockContext.subscriptions.length;
            
            // Each activation should add the same commands again
            expect(secondCallSubscriptions).to.equal(firstCallSubscriptions * 2);
        });
    });

    suite('command verification', () => {
        test('should have imported command modules successfully', () => {
            // Since commands are imported at the module level in extension.ts,
            // we can verify they are available for subscription
            activate(mockContext);
            
            // The commands should be added to subscriptions
            expect(mockContext.subscriptions).to.have.length(3);
            
            // Each subscription should have a dispose method (indicating it's a proper command)
            mockContext.subscriptions.forEach((subscription: any) => {
                expect(subscription).to.have.property('dispose');
                expect(typeof subscription.dispose).to.equal('function');
            });
        });
    });
});
