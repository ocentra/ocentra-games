import type { FlowContext } from '@/flows/core/FlowContext';
import type { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowResult } from '@/flows/core/FlowResult';

export type FlowProjection<TBody> = (result: FlowResult<TBody>, context: FlowContext) => Promise<void> | void;

export class FlowRunner {
  async run<TInput, TBody>(
    flow: BaseFlow<TInput, TBody>,
    context: FlowContext,
    input: TInput,
    projection?: FlowProjection<TBody>
  ): Promise<FlowResult<TBody>> {
    const result = await flow.execute(context, input);
    if (projection) {
      void Promise.resolve(projection(result, context)).catch(() => undefined);
    }
    return result;
  }
}
