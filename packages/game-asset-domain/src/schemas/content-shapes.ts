import { z } from 'zod';
import { PageSectionType } from '@/constants/page-section-type';
import { ContentBlockType } from '@/constants/content-block-type';
import { ListStyleType } from '@/constants/list-style-type';
import { EmphasisType } from '@/constants/emphasis-type';

const PageSectionTypeSchema = z.enum([
  PageSectionType.About,
  PageSectionType.Rules,
  PageSectionType.Strategy,
  PageSectionType.Scoring,
  PageSectionType.Text,
  PageSectionType.Screenshots,
  PageSectionType.Custom,
]);

const EmphasisTypeSchema = z.enum([EmphasisType.Bold, EmphasisType.Italic, EmphasisType.Strong]);
const ListStyleTypeSchema = z.enum([ListStyleType.Unordered, ListStyleType.Ordered]);

const TextBlockSchema = z.object({
  type: z.literal(ContentBlockType.Text),
  text: z.string(),
  emphasis: EmphasisTypeSchema.optional(),
});

const ParagraphBlockSchema = z.object({
  type: z.literal(ContentBlockType.Paragraph),
  text: z.string(),
});

const HeadingBlockSchema = z.object({
  type: z.literal(ContentBlockType.Heading),
  level: z.union([z.literal(3), z.literal(4)]),
  text: z.string(),
  icon: z.string().optional(),
});

const ListItemSchema = z.object({
  text: z.string(),
  subItems: z.array(z.string()).optional(),
});

const ListBlockSchema = z.object({
  type: z.literal(ContentBlockType.List),
  style: ListStyleTypeSchema,
  items: z.array(ListItemSchema),
});

const ExampleBlockSchema = z.object({
  type: z.literal(ContentBlockType.Example),
  title: z.string().optional(),
  text: z.string(),
  result: z.string().optional(),
});

const FormulaBlockSchema = z.object({
  type: z.literal(ContentBlockType.Formula),
  formula: z.string(),
  label: z.string().optional(),
});

const SetupGridItemSchema = z.object({
  icon: z.string(),
  label: z.string(),
  detail: z.string(),
});

const SetupGridBlockSchema = z.object({
  type: z.literal(ContentBlockType.SetupGrid),
  items: z.array(SetupGridItemSchema),
});

const HighlightBlockSchema = z.object({
  type: z.literal(ContentBlockType.Highlight),
  text: z.string(),
  emphasis: z.boolean().optional(),
});

const CardValueSchema = z.object({
  card: z.string(),
  value: z.number(),
});

const CardValuesBlockSchema = z.object({
  type: z.literal(ContentBlockType.CardValues),
  values: z.array(CardValueSchema),
});

const CalculationStepSchema = z.object({
  label: z.string(),
  formula: z.string(),
  result: z.string().optional(),
});

const CalculationBlockSchema = z.object({
  type: z.literal(ContentBlockType.Calculation),
  steps: z.array(CalculationStepSchema),
  total: z.string().optional(),
});

const RuleBlockSchema = z.object({
  type: z.literal(ContentBlockType.RuleBlock),
  title: z.string().optional(),
  content: z.array(z.record(z.unknown())),
});

const StrategyBlockSchema = z.object({
  type: z.literal(ContentBlockType.StrategyBlock),
  title: z.string(),
  icon: z.string().optional(),
  description: z.string(),
  example: z
    .object({
      type: z.literal(ContentBlockType.Example),
      title: z.string().optional(),
      text: z.string(),
      result: z.string().optional(),
    })
    .optional(),
});

const FullContentBlockSchema = z.union([
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

const PageSchema = z
  .object({
    title: z.string(),
    subtitle: z.string().optional(),
    content: z.array(FullContentBlockSchema).default([]),
    linkedAssets: z.array(z.string()).optional(),
  })
  .passthrough();

export const PageSectionSchema = z
  .object({
    type: PageSectionTypeSchema,
    tabLabel: z.string().min(1, 'tabLabel must be non-empty'),
    pages: z.array(PageSchema).optional(),
    subtitle: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    imageRefs: z.array(z.union([z.string(), z.record(z.unknown())])).optional(),
  })
  .passthrough();

export const PageSectionsSchema = z.array(PageSectionSchema).default([]);

export type ContentBlockValidated = z.infer<typeof FullContentBlockSchema>;
export type PageValidated = z.infer<typeof PageSchema>;
export type PageSectionValidated = z.infer<typeof PageSectionSchema>;
