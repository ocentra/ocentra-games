import { globalServiceContainer } from '@/services/core/ServiceContainer';
import { registerEventingServices } from '@/lib/eventing/serviceKeys';

registerEventingServices(globalServiceContainer);

