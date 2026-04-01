import 'reflect-metadata';
import { validateRequiredFieldsInSource } from './assets/requiredFieldValidation';

function validate(): void {
  validateRequiredFieldsInSource();
}

validate();

