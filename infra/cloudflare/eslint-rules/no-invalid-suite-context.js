/**
 * Forbids invalid suite path / suite type literals so we fail at lint time
 * instead of at test run. Suite path must not be '', 'unknown', or null.
 * Suite type must be one of: unit, integration, e2e, websocket, contract.
 */
const VALID_SUITE_TYPES = new Set([
  'unit',
  'integration',
  'e2e',
  'websocket',
  'contract',
]);

const INVALID_SUITE_PATH_VALUES = new Set(['', 'unknown']);

function getLiteralValue(node) {
  if (!node) return undefined;
  if (node.type === 'Literal') {
    return node.value;
  }
  if (node.type === 'Identifier' && node.name === 'null') {
    return null;
  }
  if (node.type === 'Identifier' && node.name === 'undefined') {
    return undefined;
  }
  return undefined;
}

function isKnownLiteral(node) {
  if (!node) return false;
  if (node.type === 'Literal') return true;
  if (node.type === 'Identifier' && (node.name === 'null' || node.name === 'undefined')) return true;
  return false;
}

function isInvalidSuitePathLiteral(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '' || INVALID_SUITE_PATH_VALUES.has(normalized);
}

function isInvalidSuiteTypeLiteral(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  return !VALID_SUITE_TYPES.has(normalized);
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid invalid suite path (empty, "unknown", null) and invalid suite type (must be unit/integration/e2e/websocket/contract). Catch at lint time instead of test run.',
    },
    messages: {
      invalidSuitePath:
        'Invalid suite path: use a non-empty file path, not {{value}}. Empty, "unknown", and null cause "unknown" log filing.',
      invalidSuiteType:
        'Invalid suite type: must be one of unit, integration, e2e, websocket, contract, not {{value}}.',
    },
    schema: [],
  },
  create(context) {
    function checkSuitePathLiteral(node, value, what) {
      if (isInvalidSuitePathLiteral(value)) {
        context.report({
          node,
          messageId: 'invalidSuitePath',
          data: { value: String(value) },
        });
      }
    }

    function checkSuiteTypeLiteral(node, value, what) {
      if (isInvalidSuiteTypeLiteral(value)) {
        context.report({
          node,
          messageId: 'invalidSuiteType',
          data: { value: String(value) },
        });
      }
    }

    return {
      AssignmentExpression(node) {
        const left = node.left;
        if (left?.type !== 'MemberExpression' || !left.property) return;
        const propName = left.property.type === 'Identifier' ? left.property.name : null;
        if (propName !== 'suitePath' && propName !== 'suiteType') return;
        if (!isKnownLiteral(node.right)) return;
        const literal = getLiteralValue(node.right);
        if (propName === 'suitePath') {
          checkSuitePathLiteral(node.right, literal, 'assignment');
        } else {
          checkSuiteTypeLiteral(node.right, literal, 'assignment');
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        const args = node.arguments || [];

        if (callee?.type === 'Identifier' && callee.name === 'setSetupContext') {
          const suitePathArg = args[1];
          if (suitePathArg) {
            const literal = getLiteralValue(suitePathArg);
            if (literal !== undefined) {
              checkSuitePathLiteral(suitePathArg, literal, 'setSetupContext');
            }
          }
          return;
        }

        if (
          callee?.type === 'MemberExpression' &&
          callee.property?.type === 'Identifier' &&
          callee.property.name === 'set'
        ) {
          const firstArg = args[0];
          const secondArg = args[1];
          if (!firstArg || firstArg.type !== 'Literal' || !secondArg) return;
          const headerName =
            typeof firstArg.value === 'string' ? firstArg.value : null;
          if (headerName === 'X-Suite-Path') {
            if (!isKnownLiteral(secondArg)) return;
            const literal = getLiteralValue(secondArg);
            checkSuitePathLiteral(secondArg, literal, 'header');
          } else if (headerName === 'X-Suite-Type') {
            if (!isKnownLiteral(secondArg)) return;
            const literal = getLiteralValue(secondArg);
            checkSuiteTypeLiteral(secondArg, literal, 'header');
          }
        }
      },
    };
  },
};
