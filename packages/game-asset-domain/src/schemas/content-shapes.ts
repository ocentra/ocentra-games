import { schema } from '@ocentra/schema-domain/effect-builder';
import { PageSectionType } from '@/constants/page-section-type';
import { ContentBlockType } from '@/constants/content-block-type';
import { ListStyleType } from '@/constants/list-style-type';
import { EmphasisType } from '@/constants/emphasis-type';

const PageSectionTypeSchema = schema.enum([
  PageSectionType.About,
  PageSectionType.Rules,
  PageSectionType.Strategy,
  PageSectionType.Scoring,
  PageSectionType.Text,
  PageSectionType.Screenshots,
  PageSectionType.Custom,
]);

const EmphasisTypeSchema = schema.enum([EmphasisType.Bold, EmphasisType.Italic, EmphasisType.Strong]);
const ListStyleTypeSchema = schema.enum([ListStyleType.Unordered, ListStyleType.Ordered]);

const TextBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.Text),
  text: schema.string(),
  emphasis: EmphasisTypeSchema.optional(),
});

const ParagraphBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.Paragraph),
  text: schema.string(),
});

const HeadingBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.Heading),
  level: schema.union([schema.literal(3), schema.literal(4)]),
  text: schema.string(),
  icon: schema.string().optional(),
});

const ListItemSchema = schema.object({
  text: schema.string(),
  subItems: schema.array(schema.string()).optional(),
});

const ListBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.List),
  style: ListStyleTypeSchema,
  items: schema.array(ListItemSchema),
});

const ExampleBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.Example),
  title: schema.string().optional(),
  text: schema.string(),
  result: schema.string().optional(),
});

const FormulaBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.Formula),
  formula: schema.string(),
  label: schema.string().optional(),
});

const SetupGridItemSchema = schema.object({
  icon: schema.string(),
  label: schema.string(),
  detail: schema.string(),
});

const SetupGridBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.SetupGrid),
  items: schema.array(SetupGridItemSchema),
});

const HighlightBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.Highlight),
  text: schema.string(),
  emphasis: schema.boolean().optional(),
});

const CardValueSchema = schema.object({
  card: schema.string(),
  value: schema.number(),
});

const CardValuesBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.CardValues),
  values: schema.array(CardValueSchema),
});

const CalculationStepSchema = schema.object({
  label: schema.string(),
  formula: schema.string(),
  result: schema.string().optional(),
});

const CalculationBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.Calculation),
  steps: schema.array(CalculationStepSchema),
  total: schema.string().optional(),
});

const RuleBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.RuleBlock),
  title: schema.string().optional(),
  content: schema.array(schema.record(schema.unknown())),
});

const StrategyBlockSchema = schema.object({
  type: schema.literal(ContentBlockType.StrategyBlock),
  title: schema.string(),
  icon: schema.string().optional(),
  description: schema.string(),
  example: schema
    .object({
      type: schema.literal(ContentBlockType.Example),
      title: schema.string().optional(),
      text: schema.string(),
      result: schema.string().optional(),
    })
    .optional(),
});

const FullContentBlockSchema = schema.union([
  TextBlockSchema,
  ParagraphBlockSchema,
  HeadingBlockSchema,
  ListBlockSchema,
  RuleBlockSchema,
  StrategyBlockSchema,
  ExampleBlockSchema,
  FormulaBlockSchema,
  SetupGridBlockSchema,
  HighlightBlockSchema,
  CardValuesBlockSchema,
  CalculationBlockSchema,
]);

const PageSchema = schema
  .object({
    title: schema.string(),
    subtitle: schema.string().optional(),
    content: schema.array(FullContentBlockSchema).default([]),
    linkedAssets: schema.array(schema.string()).optional(),
  })
  .passthrough();

export const PageSectionSchema = schema
  .object({
    type: PageSectionTypeSchema,
    tabLabel: schema.string().min(1, 'tabLabel must be non-empty'),
    pages: schema.array(PageSchema).optional(),
    subtitle: schema.string().optional(),
    title: schema.string().optional(),
    content: schema.string().optional(),
    imageRefs: schema.array(schema.union([schema.string(), schema.record(schema.unknown())])).optional(),
  })
  .passthrough();

export const PageSectionsSchema = schema.array(PageSectionSchema).default([]);

export type ContentBlockValidated = schema.infer<typeof FullContentBlockSchema>;
export type PageValidated = schema.infer<typeof PageSchema>;
export type PageSectionValidated = schema.infer<typeof PageSectionSchema>;
