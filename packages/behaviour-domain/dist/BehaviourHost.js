import { useEffect, useRef, createElement, Fragment } from 'react';
export const BehaviourHost = ({ create, context, onReady, autoStart = true, children, }) => {
    const behaviourRef = useRef(null);
    useEffect(() => {
        const behaviour = create(context);
        behaviourRef.current = behaviour;
        behaviour.__initialize();
        onReady?.(behaviour);
        if (autoStart)
            behaviour.start();
        else
            behaviour.enable();
        return () => {
            behaviour.destroy();
            behaviourRef.current = null;
        };
    }, [create, context, onReady, autoStart]);
    return createElement(Fragment, null, children ?? null);
};
