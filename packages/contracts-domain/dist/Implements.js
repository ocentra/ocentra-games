import { assertImplements, areRuntimeContractsEnabled, } from './Interface.js';
export const Implements = (name, spec) => function (constructor) {
    if (!areRuntimeContractsEnabled()) {
        return constructor;
    }
    const ContractChecked = class extends constructor {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            assertImplements(this, name, spec);
        }
    };
    return ContractChecked;
};
