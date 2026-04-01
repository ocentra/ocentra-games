export class ScriptableObjectRegistry {
    static registrations = [];
    static register(constructor, getOrCreateInstance) {
        const constructorWithOrder = constructor;
        const executionOrder = constructorWithOrder.executionOrder ?? 0;
        this.registrations.push({
            constructor,
            executionOrder,
            getOrCreateInstance,
        });
        this.registrations.sort((a, b) => a.executionOrder - b.executionOrder);
    }
    static getRegistrations() {
        return this.registrations;
    }
    static async initializeAll() {
        for (const registration of this.registrations) {
            await registration.getOrCreateInstance();
        }
    }
}
