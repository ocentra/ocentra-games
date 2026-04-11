export interface FlowResult<TBody = unknown> {
  status: number;
  body: TBody;
  warnings?: string[];
}

