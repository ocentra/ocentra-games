const VALID_OPTION_KEYS = new Set([
  'runIn',
  'poolSequential',
  'storage',
  'concurrent',
  'retry',
]);

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Top-level describe must include TestSuiteType and valid options (runIn, poolSequential)',
    },
    messages: {
      missingSuiteType:
        'Top-level describe must include TestSuiteType as second argument. ' +
        'Use: describe(extractName(import.meta.url), TestSuiteType.Unit, () => { ... })',
      runInUseConstant:
        'runIn must use RunIn.Unstable or RunIn.Pool, not string literal. ' +
        'Import RunIn from @tests/helpers/test-utils.',
      poolSequentialMustBeBoolean:
        'poolSequential must be a boolean literal (true/false).',
      invalidOptionKey:
        'Invalid describe option "{{key}}". Valid keys: runIn, poolSequential, storage, concurrent, retry.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename?.() ?? context.filename ?? '';
    if (!filename.endsWith('.test.ts') && !filename.endsWith('.spec.ts')) {
      return {};
    }
    const isIntegrationOrE2E =
      filename.replace(/\\/g, '/').includes('/tests/integration/') ||
      filename.replace(/\\/g, '/').includes('/tests/e2e/');

    function isTopLevel(node) {
      let current = node;
      while (current) {
        const parent = current.parent;
        if (parent?.type === 'Program') {
          return parent.body.some(
            (stmt) =>
              stmt.type === 'ExpressionStatement' && stmt.expression === node
          );
        }
        current = parent;
      }
      return false;
    }

    function isDescribeCall(node) {
      if (node.type !== 'CallExpression' || !node.callee) return false;
      const callee = node.callee;
      if (callee.type === 'Identifier' && callee.name === 'describe') {
        return true;
      }
      if (
        callee.type === 'MemberExpression' &&
        callee.object?.type === 'Identifier' &&
        callee.object.name === 'describe' &&
        callee.property?.type === 'Identifier' &&
        (callee.property.name === 'only' || callee.property.name === 'skip')
      ) {
        return true;
      }
      return false;
    }

    function isTestSuiteTypeSecondArg(node) {
      if (!node.arguments || node.arguments.length < 3) return false;
      const second = node.arguments[1];
      if (!second || second.type !== 'MemberExpression') return false;
      const obj = second.object;
      const prop = second.property;
      if (obj?.type !== 'Identifier' || obj.name !== 'TestSuiteType') {
        return false;
      }
      const valid = ['Unit', 'Integration', 'E2E', 'Websocket', 'Contract'];
      if (prop?.type === 'Identifier' && valid.includes(prop.name)) {
        return true;
      }
      return false;
    }

    function getOptionsArg(node) {
      if (!node.arguments || node.arguments.length < 4) return null;
      const third = node.arguments[2];
      if (!third || third.type !== 'ObjectExpression') return null;
      return third;
    }

    function validateOptions(optionsNode) {
      if (!isIntegrationOrE2E) return;
      for (const prop of optionsNode.properties) {
        if (prop.type !== 'Property' || prop.key?.type !== 'Identifier') continue;
        const key = prop.key.name;
        if (!VALID_OPTION_KEYS.has(key)) {
          context.report({
            node: prop.key,
            messageId: 'invalidOptionKey',
            data: { key },
          });
        }
        if (key === 'runIn' && prop.value) {
          const v = prop.value;
          if (v.type === 'Literal' && typeof v.value === 'string') {
            context.report({
              node: prop.value,
              messageId: 'runInUseConstant',
            });
          }
        }
        if (key === 'poolSequential' && prop.value) {
          const v = prop.value;
          if (v.type !== 'Literal' || typeof v.value !== 'boolean') {
            context.report({
              node: prop.value,
              messageId: 'poolSequentialMustBeBoolean',
            });
          }
        }
      }
    }

    return {
      CallExpression(node) {
        if (!isDescribeCall(node)) return;
        if (!isTopLevel(node)) return;
        if (node.arguments?.length >= 3 && isTestSuiteTypeSecondArg(node)) {
          const options = getOptionsArg(node);
          if (options) validateOptions(options);
          return;
        }
        if (node.arguments?.length === 2) {
          context.report({
            node,
            messageId: 'missingSuiteType',
          });
        }
      },
    };
  },
};
