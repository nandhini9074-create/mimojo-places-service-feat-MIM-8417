import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsBoolean,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { PaymentMethods } from "../enums/payment-methods-enum";

export class AddOutletTabDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @Type(() => AddOutletTabElementDto)
  tabs: AddOutletTabElementDto[];
}

export class AddOutletTabElementDto {
  @IsString()
  @Length(1, 50)
  tabNumber: string;
}

export class AddOutletConfigDto {
  @IsString()
  countryName: string;

  @IsString()
  cityName: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  redirectBaseURL: string;

  @IsUrl()
  @IsOptional()
  menuLink: string | null;

  @IsBoolean()
  @IsOptional()
  hasInroomDining: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethods, { each: true })
  disabledPaymentMethods: PaymentMethods | null;
}

export class SaveOutletPriceConfigDto {
  @Min(0)
  @Max(100)
  @IsOptional()
  merchantTransactionFeePercentage: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  suggestedTipPercentage: number | null;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  maximumTipPercentage: number | null;

  @IsNumber()
  @Min(0)
  @Max(100)
  fastPaymentChargesPercentage: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  inclusiveServiceChargePercentage: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  inclusiveVatPercentage: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  inclusiveMunicipalityFeePercentage: number;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  inclusivePriceInfo: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  tipNote: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  @Type(() => PaymentSplitId)
  paymentSplitId: PaymentSplitId[];
}

export class PaymentSplitId {
  @IsString()
  key: string;

  @IsString()
  value: string;
}
