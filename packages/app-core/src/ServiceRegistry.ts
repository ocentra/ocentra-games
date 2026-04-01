export interface ServiceRegistration {
  name: string;
  executionOrder: number;
  getOrCreateInstance: () => Promise<unknown>;
}

export class ServiceRegistry {
  private static registrations: ServiceRegistration[] = [];

  static register(
    serviceClass: { executionOrder?: number },
    name: string,
    getOrCreateInstance: () => Promise<unknown>
  ): void {
    const executionOrder = serviceClass.executionOrder ?? 0;

    this.registrations.push({
      name,
      executionOrder,
      getOrCreateInstance,
    });

    this.registrations.sort((a, b) => a.executionOrder - b.executionOrder);
  }

  static getRegistrations(): readonly ServiceRegistration[] {
    return this.registrations;
  }

  static async initializeAll(): Promise<void> {
    for (const registration of this.registrations) {
      await registration.getOrCreateInstance();
    }
  }
}
