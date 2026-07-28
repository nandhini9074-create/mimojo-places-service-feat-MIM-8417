import { BadRequestException, ValidationError } from '@nestjs/common';

export const exceptionFactory = (validationErrors: ValidationError[] = []) => {
  const errors: string[] = [];
  extractErrors(validationErrors, errors);
  return new BadRequestException(`${errors}`);
};

function extractErrors(errors: ValidationError[], allErrors: string[]) {
  errors.forEach((error) => {
    if (error.constraints) {
      Object.values(error.constraints).forEach((constraint) => allErrors.push(constraint));
    }
    
    if (error.children && error.children.length > 0) {
      extractErrors(error.children, allErrors);
    }
  });
}