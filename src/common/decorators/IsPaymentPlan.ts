import { ValidationOptions, registerDecorator, ValidationArguments } from 'class-validator';

export function IsPaymentPlan(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'isPaymentPlan',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          const paymentPlan = value?.toUpperCase();
          return paymentPlan === 'PRE-PAY' || paymentPlan === 'POST-PAY';
        },
        defaultMessage(args: ValidationArguments) {
          return `"${args.property}" must be "Pre-pay" or "Post-pay".`;
        }
      }
    });
  };
}
