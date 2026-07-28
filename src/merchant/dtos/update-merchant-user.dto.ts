import { IsEmail, IsOptional, IsUUID } from 'class-validator';
import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';

export class UpdateMerchantUserDto {
  @IsNotEmptyString()
  @IsUUID()
  declare merchantId: string;

  @IsNotEmptyString()
  @IsUUID()
  declare userId: string;

  @IsNotEmptyString()
  @IsEmail()
  @IsOptional()
  declare email: string;

  @IsNotEmptyString()
  @IsOptional()
  declare mobile: string;
}
