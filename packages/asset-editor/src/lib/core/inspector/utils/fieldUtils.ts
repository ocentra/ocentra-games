/**
 * Checks if a string value should be rendered as a multiline field.
 * @param value The string value to check.
 * @param fieldName Optional field name to check against known multiline fields.
 * @returns True if the value should be multiline.
 */
export function isMultiline(value: string, fieldName?: string): boolean {
  const multilineFieldNames = [
    'description', 'rules', 'tips', 'content', 'text', 
    'message', 'note', 'comment', 'bonusRules', 'exampleHands'
  ];
  
  if (fieldName && multilineFieldNames.some(name => fieldName.toLowerCase().includes(name))) {
    return true;
  }
  
  return value.includes('\n') || 
         value.length > 80 || 
         value.includes('\n-') || 
         value.includes('\n*') ||
         value.split('\n').length > 1;
}
