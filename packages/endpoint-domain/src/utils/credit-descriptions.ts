import { CreditDescriptionTemplate } from '@/constants/credits';
import { PathPlaceholder } from '@/constants/paths';

export function formatCreditDescription(template: CreditDescriptionTemplate, values: Record<string, string | number>): string {
  let description: string = template;
  for (const [key, value] of Object.entries(values)) {
    description = description.replace(PathPlaceholder.wrap(key), String(value));
  }
  return description;
}

export function formatPurchasedACDescription(amount: number): string {
  return formatCreditDescription(CreditDescriptionTemplate.PurchasedAC, { amount });
}

export function formatConsumedACDescription(amount: number): string {
  return formatCreditDescription(CreditDescriptionTemplate.ConsumedAC, { amount });
}

export function formatConsumedGPDescription(amount: number): string {
  return formatCreditDescription(CreditDescriptionTemplate.ConsumedGP, { amount });
}

export function formatRollbackDescription(description: string): string {
  return formatCreditDescription(CreditDescriptionTemplate.Rollback, { description });
}
