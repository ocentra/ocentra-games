import type { ScriptableObject } from '@/ScriptableObject';

interface ScriptableObjectRegistration {
  constructor: new () => ScriptableObject;
  executionOrder: number;
  getOrCreateInstance: () => Promise<ScriptableObject>;
}

export class ScriptableObjectRegistry {
  private static registrations: ScriptableObjectRegistration[] = [];

  static register(
    constructor: new () => ScriptableObject,
    getOrCreateInstance: () => Promise<ScriptableObject>
  ): void {
    const constructorWithOrder = constructor as unknown as { executionOrder?: number };
    const executionOrder = constructorWithOrder.executionOrder ?? 0;

    this.registrations.push({
      constructor,
      executionOrder,
      getOrCreateInstance,
    });

    this.registrations.sort((a, b) => a.executionOrder - b.executionOrder);
  }

  static getRegistrations(): readonly ScriptableObjectRegistration[] {
    return this.registrations;
  }

  static async initializeAll(): Promise<void> {
    for (const registration of this.registrations) {
      await registration.getOrCreateInstance();
    }
  }
}
