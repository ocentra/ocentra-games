export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}
export interface FieldValidationResult {
    field: string;
    isValid: boolean;
    errors: ValidationError[];
}
