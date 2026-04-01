import {
  ModelManager as DomainModelManager,
} from '@ocentra/ai-domain/orchestration/ModelManager';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';

export class ModelManager extends DomainModelManager {
  static executionOrder = -25;
  private static appInstance: ModelManager | null = null;

  static {
    this.registerService();
  }

  private constructor() {
    super();
  }

  private static registerService(): void {
    ServiceRegistry.register(
      this as { executionOrder?: number },
      'ModelManager',
      async () => {
        const instance = this.getInstance();
        return instance;
      }
    );
  }

  static override getInstance(): ModelManager {
    if (!this.appInstance) {
      this.appInstance = new ModelManager();
    }
    return this.appInstance;
  }
}
