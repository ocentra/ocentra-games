import { ErrorMessage } from '@/constants/errors';
import { PathLimits, PathSeparator } from '@/constants/paths';
import { ValidationPattern } from '@/constants/validation-patterns';

export function sanitizePathComponent(component: string): string {
  if (!component || typeof component !== 'string') {
    throw new Error(ErrorMessage.PathComponentMustBeNonEmptyString);
  }
  const sanitized = component
    .replace(ValidationPattern.PathComponentAllowed, '_')
    .replace(ValidationPattern.PathComponentTrimUnderscores, '')
    .substring(0, PathLimits.MaxComponentLength);
  if (!sanitized) {
    throw new Error(ErrorMessage.PathComponentBecameEmptyAfterSanitization);
  }
  return sanitized;
}

export function buildSafePathKey(prefix: string, ...components: string[]): string {
  const sanitizedComponents = components.map((component, index) => {
    const isLastComponent = index === components.length - 1;
    const lastDotIndex = component.lastIndexOf('.');
    if (isLastComponent && lastDotIndex > 0 && lastDotIndex < component.length - 1) {
      const namePart = component.substring(0, lastDotIndex);
      const extensionPart = component.substring(lastDotIndex);
      return `${sanitizePathComponent(namePart)}${extensionPart}`;
    }
    return sanitizePathComponent(component);
  });
  return `${prefix}${PathSeparator.ForwardSlash}${sanitizedComponents.join(PathSeparator.ForwardSlash)}`;
}
