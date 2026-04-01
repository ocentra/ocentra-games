import {
  assertImplements,
  areRuntimeContractsEnabled,
  type InterfaceSpec,
} from './Interface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor<T extends object = object> = new (...args: any[]) => T;

export const Implements = (name: string, spec: InterfaceSpec) =>
  function <T extends AnyConstructor>(constructor: T): T {
    if (!areRuntimeContractsEnabled()) {
      return constructor;
    }

    const ContractChecked = class extends constructor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        super(...args);
        assertImplements(this, name, spec);
      }
    };

    return ContractChecked as T;
  };
