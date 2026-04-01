export const PromiseStatus = {
  Fulfilled: 'fulfilled',
  Rejected: 'rejected',
} as const;

export type PromiseStatus = typeof PromiseStatus[keyof typeof PromiseStatus];
