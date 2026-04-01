import type { InterfaceSpec } from '@ocentra/boundary-domain/contracts/Interface';

export const IEventHandlerContract: InterfaceSpec = {
  subscribeToEvents: 'function',
  unsubscribeFromEvents: 'function',
};

export const IEventArgsContract: InterfaceSpec = {
  timestamp: { type: 'number' },
  uniqueIdentifier: { type: 'string' },
  isRePublishable: { type: 'boolean' },
  dispose: 'function',
};

export const EventBusContract: InterfaceSpec = {
  subscribe: 'function',
  unsubscribe: 'function',
  publish: 'function',
  subscribeAsync: { type: 'function', optional: true },
  unsubscribeAsync: { type: 'function', optional: true },
  publishAsync: { type: 'function', optional: true },
  clear: 'function',
};

export const IEventRegistrarContract: InterfaceSpec = {
  subscribe: 'function',
  subscribeAsync: 'function',
  unsubscribeAll: 'function',
};

export const IOperationResultContract: InterfaceSpec = {
  isSuccess: { type: 'boolean' },
  value: { type: 'any', optional: true },
  attempts: { type: 'number' },
  errorMessage: { type: 'string', optional: true },
};

