import { getTestDataGenerator } from './test-data';

export type AttackVector = 
  | 'unicode-invisible'
  | 'unicode-normalization'
  | 'double-encoding'
  | 'trailing-whitespace'
  | 'boundary-values';

export interface AttackPayload {
  value: string;
  description: string;
  attackVector: AttackVector;
}

export function generateAttackPayloads(
  paramType: 'path' | 'query' | 'header',
  paramName: string,
  attackVector: AttackVector
): AttackPayload[] {
  const generator = getTestDataGenerator(paramType, paramName);

  switch (attackVector) {
    case 'unicode-invisible':
      return generator.generateInvalidUnicode().map(value => ({
        value,
        description: `Unicode invisible character in ${paramName}`,
        attackVector: 'unicode-invisible',
      }));

    case 'unicode-normalization':
      return generator.generateInvalidNormalization().map(value => ({
        value,
        description: `Unicode normalization attack in ${paramName}`,
        attackVector: 'unicode-normalization',
      }));

    case 'double-encoding':
      return generator.generateInvalidDoubleEncoded().map(value => ({
        value,
        description: `Double-encoded ${paramName}`,
        attackVector: 'double-encoding',
      }));

    case 'trailing-whitespace':
      return generator.generateInvalidWhitespace().map(value => ({
        value,
        description: `Trailing/leading whitespace in ${paramName}`,
        attackVector: 'trailing-whitespace',
      }));

    case 'boundary-values':
      return generator.generateInvalidBoundary().map(value => ({
        value,
        description: `Boundary value for ${paramName}`,
        attackVector: 'boundary-values',
      }));

    default:
      return [];
  }
}

export function getAllAttackVectors(): AttackVector[] {
  return [
    'unicode-invisible',
    'unicode-normalization',
    'double-encoding',
    'trailing-whitespace',
    'boundary-values',
  ];
}
