import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { OutletFastPaymentStatusEnum } from "../enums/outlet-status-enum";

export class UpdateOutletDto {
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  redirectBaseURL?: string;

  @IsUrl()
  @IsOptional()
  menuLink?: string | null;

  @IsOptional()
  @IsEnum(OutletFastPaymentStatusEnum)
  status?: OutletFastPaymentStatusEnum;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DescriptionType)
  description?: DescriptionType[];
}

class DescriptionType {
  @IsString()
  key: string;

  @IsString()
  value: string;
}
