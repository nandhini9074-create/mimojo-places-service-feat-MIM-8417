import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsNotBlank(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isNotBlank',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }
          return value.trim().length > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not be blank`;
        },
      },
    });
  };
}
