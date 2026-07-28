import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'SanitizeDouble', async: false })
export class SanitizeDouble implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    // Check if the value is a number or a string that can be parsed as a number
    if (isNaN(Number(value))) {
      return false;
    }

    // Convert the value to a string and remove any non-numeric characters
    const sanitizedValue = String(value).replace(/[^0-9\.\-]/g, '');

    // Check if the sanitized value matches the original value
    return sanitizedValue === String(value);
  }

  defaultMessage(): string {
    return 'Invalid double value';
  }
}
