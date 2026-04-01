/**
 * ESLint rule: no-worker-fetch-in-before-all
 *
 * Flags worker.fetch() calls inside beforeAll() that don't pass a SetupContextToken.
 *
 * In beforeAll, test context is not set (beforeEach hasn't run yet).
 * To call worker.fetch() in beforeAll, you must:
 * 1. Call setSetupContext() to set context and get a token
 * 2. Pass the token as the third argument to worker.fetch()
 *
 * Examples:
 *   BAD:  worker.fetch(url, init)           // No token - will error
 *   GOOD: worker.fetch(url, init, token)    // Token proves context is set
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow worker.fetch() in beforeAll without SetupContextToken',
    },
    messages: {
      missingToken:
        'worker.fetch() may not be called from beforeAll without a SetupContextToken. ' +
        'Call setSetupContext() first and pass the returned token as the third argument: ' +
        'worker.fetch(url, init, token).',
    },
    schema: [],
  },
  create(context) {
    // Track if we're inside a beforeAll callback
    let beforeAllDepth = 0;

    /**
     * Check if a node is a CallExpression for beforeAll(...)
     */
    function isBeforeAllCall(node) {
      return (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'beforeAll'
      );
    }

    /**
     * Check if a node is a CallExpression for worker.fetch(...)
     */
    function isWorkerFetchCall(node) {
      if (node.type !== 'CallExpression') return false;
      const callee = node.callee;
      if (callee.type !== 'MemberExpression') return false;

      // Check for worker.fetch pattern
      const object = callee.object;
      const property = callee.property;

      return (
        object &&
        object.type === 'Identifier' &&
        object.name === 'worker' &&
        property &&
        ((property.type === 'Identifier' && property.name === 'fetch') ||
         (property.type === 'Literal' && property.value === 'fetch'))
      );
    }

    /**
     * Get the callback function from a beforeAll call
     */
    function getBeforeAllCallback(node) {
      if (!node.arguments || node.arguments.length === 0) return null;
      const firstArg = node.arguments[0];

      // Handle: beforeAll(async () => { ... })
      // Handle: beforeAll(() => { ... })
      // Handle: beforeAll(function() { ... })
      // Handle: beforeAll(async function() { ... })
      if (
        firstArg.type === 'ArrowFunctionExpression' ||
        firstArg.type === 'FunctionExpression'
      ) {
        return firstArg;
      }

      return null;
    }

    return {
      CallExpression(node) {
        // Check if we're entering a beforeAll callback
        if (isBeforeAllCall(node)) {
          const callback = getBeforeAllCallback(node);
          if (callback) {
            // We'll track this when we enter the function body
            // Mark the callback so we know to increment depth when we see it
            callback._isBeforeAllCallback = true;
          }
        }

        // Check if this is a worker.fetch call and we're inside beforeAll
        if (beforeAllDepth > 0 && isWorkerFetchCall(node)) {
          // Check if there's a third argument (the token)
          if (!node.arguments || node.arguments.length < 3) {
            context.report({
              node,
              messageId: 'missingToken',
            });
          }
        }
      },

      // Track entering function bodies (for beforeAll callbacks)
      ':function'(node) {
        if (node._isBeforeAllCallback) {
          beforeAllDepth++;
        }
      },

      ':function:exit'(node) {
        if (node._isBeforeAllCallback) {
          beforeAllDepth--;
        }
      },
    };
  },
};
