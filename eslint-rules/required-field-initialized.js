export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensures @required fields are initialized in constructors',
    },
    messages: {
      requiredNotInitialized: 'Field "{{fieldName}}" is marked as @required but is not initialized in constructor',
    },
    schema: [],
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        const requiredFields = new Map();
        const initializedFields = new Set();
        
        for (const member of node.body.body) {
          if (member.type === 'PropertyDefinition' || member.type === 'ClassProperty') {
            const decorators = member.decorators || [];
            const hasRequired = decorators.some(decorator => {
              const expr = decorator.expression;
              return expr && 
                (expr.type === 'CallExpression' && expr.callee.name === 'required') ||
                (expr.type === 'Identifier' && expr.name === 'required');
            });
            
            if (hasRequired && member.key && member.key.type === 'Identifier') {
              requiredFields.set(member.key.name, member);
            }
          }
        }
        
        if (requiredFields.size === 0) {
          return;
        }
        
        for (const member of node.body.body) {
          if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
            const constructorBody = member.value.body;
            if (!constructorBody) continue;
            
            const findAssignments = (node) => {
              if (!node) return;
              
              if (node.type === 'ExpressionStatement' && node.expression) {
                const expr = node.expression;
                
                if (expr.type === 'AssignmentExpression') {
                  if (expr.left.type === 'MemberExpression' &&
                      expr.left.object.type === 'ThisExpression' &&
                      expr.left.property.type === 'Identifier') {
                    initializedFields.add(expr.left.property.name);
                  }
                }
              }
              
              if (node.body && Array.isArray(node.body)) {
                node.body.forEach(findAssignments);
              } else if (node.body) {
                findAssignments(node.body);
              }
              
              if (node.consequent) findAssignments(node.consequent);
              if (node.alternate) findAssignments(node.alternate);
            };
            
            findAssignments(constructorBody);
          }
        }
        
        for (const [fieldName, fieldNode] of requiredFields) {
          if (!initializedFields.has(fieldName)) {
            context.report({
              node: fieldNode,
              messageId: 'requiredNotInitialized',
              data: { fieldName },
            });
          }
        }
      },
    };
  },
};

