import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';

export abstract class BaseFlow<TInput, TBody = unknown> {
  abstract execute(context: FlowContext, input: TInput): Promise<FlowResult<TBody>>;
}

