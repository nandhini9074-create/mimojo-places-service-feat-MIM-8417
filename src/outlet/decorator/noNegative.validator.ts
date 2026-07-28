import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function NoNegative(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'noNegative',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          const n = Number(value);
          return !Number.isNaN(n) && n >= 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot be a negative number`;
        },
      },
    });
  };
}
