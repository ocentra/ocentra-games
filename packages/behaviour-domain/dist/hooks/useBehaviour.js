import { useEffect, useMemo } from 'react';
export const useBehaviour = (factory, context, options) => {
    const autoStart = options?.autoStart ?? true;
    const behaviour = useMemo(() => {
        const instance = factory(context);
        instance.__initialize();
        return instance;
    }, [factory, context]);
    useEffect(() => {
        if (autoStart) {
            behaviour.start();
        }
        else {
            behaviour.enable();
        }
        return () => {
            behaviour.destroy();
        };
    }, [behaviour, autoStart]);
    return behaviour;
};
