export class ServiceRegistry {
    static registrations = [];
    static register(serviceClass, name, getOrCreateInstance) {
        const executionOrder = serviceClass.executionOrder ?? 0;
        this.registrations.push({
            name,
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
