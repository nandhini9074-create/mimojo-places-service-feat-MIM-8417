import { IsEnum, IsOptional } from 'class-validator';
import { MerchantPaymentPlanEnum } from '../enums/merchant-payment-plan.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMerchantPaymentPlanDto {
  @ApiPropertyOptional({
    description: 'Merchant payment plan',
    enum: MerchantPaymentPlanEnum,
    enumName: 'MerchantPaymentPlanEnum'
  })
  @IsOptional()
  @IsEnum(MerchantPaymentPlanEnum)
  paymentPlan: MerchantPaymentPlanEnum;
}
