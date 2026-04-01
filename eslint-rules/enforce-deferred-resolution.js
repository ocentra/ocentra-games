export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensures async event handlers with OperationDeferred always call resolve() or reject()',
    },
    messages: {
      deferredNotResolved: 'Async event handler with OperationDeferred must call event.deferred.resolve() or event.deferred.reject()',
    },
    schema: [],
  },
  create(context) {
    function hasDeferredCall(node, eventParamName) {
      if (!node) return false;
      
      const findCalls = (n) => {
        if (!n || typeof n !== 'object') return false;
        
        if (n.type === 'CallExpression' && n.callee) {
          const callee = n.callee;
          if (callee.type === 'MemberExpression') {
            const obj = callee.object;
            const prop = callee.property;
            
            if (obj.type === 'MemberExpression' && 
                obj.object.type === 'Identifier' && 
                obj.object.name === eventParamName &&
                obj.property.type === 'Identifier' && 
                obj.property.name === 'deferred' &&
                prop.type === 'Identifier' && 
                (prop.name === 'resolve' || prop.name === 'reject')) {
              return true;
            }
          }
        }
        
        for (const key in n) {
          if (key === 'parent' || key === 'range' || key === 'loc' || key === 'leadingComments' || key === 'trailingComments') {
            continue;
          }
          const child = n[key];
          if (Array.isArray(child)) {
            for (const item of child) {
              if (findCalls(item)) return true;
            }
          } else if (child && typeof child === 'object') {
            if (findCalls(child)) return true;
          }
        }
        
        return false;
      };
      
      return findCalls(node);
    }

    function accessesDeferred(node, eventParamName) {
      if (!node) return false;
      
      const findDeferredAccess = (n) => {
        if (!n || typeof n !== 'object') return false;
        
        if (n.type === 'MemberExpression') {
          const obj = n.object;
          
          if (obj.type === 'MemberExpression' && 
              obj.object.type === 'Identifier' && 
              obj.object.name === eventParamName &&
              obj.property.type === 'Identifier' && 
              obj.property.name === 'deferred') {
            return true;
          }
        }
        
        for (const key in n) {
          if (key === 'parent' || key === 'range' || key === 'loc' || key === 'leadingComments' || key === 'trailingComments') {
            continue;
          }
          const child = n[key];
          if (Array.isArray(child)) {
            for (const item of child) {
              if (findDeferredAccess(item)) return true;
            }
          } else if (child && typeof child === 'object') {
            if (findDeferredAccess(child)) return true;
          }
        }
        
        return false;
      };
      
      return findDeferredAccess(node);
    }

    function checkAsyncFunction(node) {
      if (!node.async) return;
      
      for (const param of node.params || []) {
        if (param.type !== 'Identifier') continue;
        
        const paramName = param.name;
        const body = node.body;
        if (!body) continue;
        
        const bodyStatements = body.type === 'BlockStatement' ? body.body : [body];
        const bodyNode = { body: bodyStatements };
        
        const hasDeferredAccess = accessesDeferred(bodyNode, paramName);
        
        if (hasDeferredAccess && !hasDeferredCall(bodyNode, paramName)) {
          context.report({
            node: node,
            messageId: 'deferredNotResolved',
          });
        }
      }
    }

    return {
      FunctionDeclaration: checkAsyncFunction,
      ArrowFunctionExpression: checkAsyncFunction,
    };
  },
};

