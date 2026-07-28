import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { MerchantStatusEnum } from '../enums/merchant-status.enum';

export class FastPaymentMerchantStatusDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  currencyId: string;

  @IsUrl()
  @IsOptional()
  logoUrl: string | null;

  @IsEnum(MerchantStatusEnum)
  status: MerchantStatusEnum;

  @IsString()
  @IsOptional()
  merchantId: string;
}

export interface FastPaymentMerchantStatusResponse {
  data: boolean;
}
