import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import POSProviderEnum from "../enums/pos-provider-enum";
import { Type } from "class-transformer";

export class SaveOutletPOSConfigDto {

  @IsEnum(POSProviderEnum)
  posProvider: POSProviderEnum;

  @IsString()
  @IsOptional()
  posMerchantId: string | null;

  @IsBoolean()
  @IsOptional()
  skipWebhookConfig?: boolean | null;

  @IsString()
  posOutletId: string;

  @IsString()
  @IsOptional()
  posSecretKey: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  @Type(() => OutletPosDynamicConfigDto)
  dynamicConfigs: OutletPosDynamicConfigDto[];
}

export class OutletPosDynamicConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}
