import { registerDecorator, ValidationOptions, ValidationArguments, isURL } from 'class-validator';

export function IsUrlWithHttpsAndWww(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isUrlWithHttpsAndWww',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }
          const urlWithoutPath = value.replace(/\/+$/, '').split('?')[0];
          return isURL(urlWithoutPath, {
            protocols: ['http', 'https'],
            require_protocol: false,
          });
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid URL with or without "https" and "www" prefixes`;
        },
      },
    });
  };
}
