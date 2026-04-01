/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IEventArgs {

  readonly timestamp: number;
  readonly uniqueIdentifier: string;
  isRePublishable: boolean;
  dispose(): void;
}

export interface EventTypeDescriptor {
  readonly eventType: string;
}

export type EventConstructor<T extends IEventArgs> = {
  new (...args: any[]): T;
} & EventTypeDescriptor;

