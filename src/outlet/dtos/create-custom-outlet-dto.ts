import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotBlank } from "../decorator/isNotBlank.validator";
import { CreateManualOutletAddressDto } from "./create-manual-outlet-address-dto";
import { CreateOutletTimingDto } from "./create-outlet-timing-dto";
import { CustomOutletFiltersDto } from "./custom-outlet-filter-dto";
import { NoNegative } from "../decorator/noNegative.validator";
import { IsUrlWithHttpsAndWww } from "../decorator/isUrlWithHttpsAndWww.validator";
import { MidPidRelationDto } from "./mid-pid-relation-dto";
import {
  AddOutletConfigDto,
  AddOutletTabElementDto,
  SaveOutletPriceConfigDto,
} from "./add-outlet-dto";
import { SaveOutletPOSConfigDto } from "./create-pos-config-dto";

class OutletFastPaymentDescription {
  @ApiProperty({ example: "note" })
  @IsString()
  key: string;

  @ApiProperty({ example: "Fast checkout available" })
  @IsString()
  value: string;
}

export class CreateCustomOutletDto {
  @ApiPropertyOptional({ format: "uuid", example: "f47ac10b-58cc-4372-a567-0e02b2c3d479" })
  @IsUUID()
  @IsOptional()
  id: string;

  @ApiProperty({ format: "uuid", example: "a12ac10b-58cc-4372-a567-0e02b2c3d479" })
  @IsUUID()
  @IsNotEmpty()
  merchantId: string;

  @ApiPropertyOptional({ maxLength: 150, example: "Starbucks Downtown" })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  @IsNotBlank()
  merchantName: string;

  @ApiPropertyOptional({ maxLength: 2000, example: "https://cdn.example.com/logo.png" })
  @MaxLength(2000)
  @IsOptional()
  @IsUrl()
  merchantLogoUrl: string;

  @ApiPropertyOptional({ type: Number, example: 4.5, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @NoNegative()
  rating: number;

  @ApiPropertyOptional({ type: Number, example: 3, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @NoNegative()
  priceLevel: number;

  @ApiPropertyOptional({ maxLength: 2000, example: "https://www.example.com" })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  website: string;

  @ApiPropertyOptional({ maxLength: 2000, example: "https://www.example.com/ar" })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  websiteAr: string;

  @ApiPropertyOptional({ maxLength: 50, example: "+971500000000" })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  formattedPhoneNumber: string;

  @ApiPropertyOptional({ maxLength: 50, example: "OPEN" })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  businessStatus: string;

  @ApiPropertyOptional({ type: Number, example: 250, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @NoNegative()
  userRatingsTotal: number;

  @ApiPropertyOptional({ type: () => CreateOutletTimingDto })
  @Type(() => CreateOutletTimingDto)
  @IsOptional()
  outletTiming: CreateOutletTimingDto;

  @ApiPropertyOptional({ type: [String], maxLength: 2000, example: ["https://cdn.example.com/photo1.jpg"] })
  @MaxLength(2000, { each: true })
  @IsUrl(undefined, { each: true })
  @IsOptional()
  photos: string[];

  @ApiPropertyOptional({ type: [String], maxLength: 15, example: ["M123", "M124"] })
  @MaxLength(15, { each: true })
  @IsString({ each: true })
  @IsOptional()
  merchantIdsManual: string[];

  @ApiPropertyOptional({ type: [String], maxLength: 15, example: ["POS001", "POS002"] })
  @MaxLength(15, { each: true })
  @IsString({ each: true })
  @IsOptional()
  posIds: string[];

  @ApiPropertyOptional({ example: "Cozy coffee shop with free Wi-Fi" })
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({ maxLength: 2000, example: "https://www.example.com/menu" })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  menuUrl: string;

  @ApiPropertyOptional({ maxLength: 2000, example: "https://www.example.com/menu-ar" })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  menuUrlAr: string;

  @ApiPropertyOptional({ maxLength: 2000, example: "https://www.example.com/booking" })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  bookingUrl: string;

  @ApiPropertyOptional({ maxLength: 2000, example: "https://www.example.com/booking-ar" })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  bookingUrlAr: string;

  @ApiPropertyOptional({ type: [CustomOutletFiltersDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomOutletFiltersDto)
  @IsOptional()
  outletFilters: CustomOutletFiltersDto[];

  @ApiPropertyOptional({ type: () => CreateManualOutletAddressDto })
  @IsOptional()
  @Type(() => CreateManualOutletAddressDto)
  @ValidateNested({ each: true })
  outletAddress: CreateManualOutletAddressDto;

  @ApiPropertyOptional({ type: [MidPidRelationDto] })
  @IsOptional()
  midPidRelation: MidPidRelationDto[];

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsBoolean()
  @IsOptional()
  checkTerminal: boolean;

  @ApiPropertyOptional({ type: [AddOutletTabElementDto], minItems: 1, maxItems: 1000 })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @Type(() => AddOutletTabElementDto)
  tabs: AddOutletTabElementDto[];

  @ApiPropertyOptional({ type: () => AddOutletConfigDto })
  @IsOptional()
  @Type(() => AddOutletConfigDto)
  @ValidateNested({ each: true })
  config: AddOutletConfigDto;

  @ApiPropertyOptional({ type: () => SaveOutletPriceConfigDto })
  @IsOptional()
  @Type(() => SaveOutletPriceConfigDto)
  @ValidateNested({ each: true })
  priceConfig: SaveOutletPriceConfigDto;

  @ApiPropertyOptional({ type: () => SaveOutletPOSConfigDto })
  @IsOptional()
  @Type(() => SaveOutletPOSConfigDto)
  @ValidateNested({ each: true })
  posConfig: SaveOutletPOSConfigDto;

  @ApiPropertyOptional({ type: [OutletFastPaymentDescription], example: [{ key: "note", value: "Fast checkout available" }] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OutletFastPaymentDescription)
  messageDescription: OutletFastPaymentDescription[];

  @ApiPropertyOptional({ type: [String], example: ["Trendy atmosphere", "Outdoor seating"] })
  @IsArray()
  @IsOptional()
  artDesc?: string[];

  @ApiPropertyOptional({ type: [String], example: ["Competitor X offers cheaper coffee"] })
  @IsArray()
  @IsOptional()
  competitorDesc?: string[];
}
