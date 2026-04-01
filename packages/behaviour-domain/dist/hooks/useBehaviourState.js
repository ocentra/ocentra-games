import { useEffect, useState } from 'react';
import { useBehaviour } from './useBehaviour.js';
export const useBehaviourState = (factory, selector, context, options) => {
    const behaviour = useBehaviour(factory, context, options);
    const [state, setState] = useState(() => selector(behaviour));
    useEffect(() => {
        setState(selector(behaviour));
        return behaviour.__subscribeState(setState, selector);
    }, [behaviour, selector]);
    return state;
};
