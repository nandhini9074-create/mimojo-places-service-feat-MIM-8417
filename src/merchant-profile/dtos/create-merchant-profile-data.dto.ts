import {
    IsUUID,
    IsString,
    IsOptional,
    IsArray,
    IsEnum,
    IsInt,
    IsBoolean,
  } from 'class-validator';
import { MerchantProfileStatusEnum } from '../enums/merchant-profile-status-enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  
  export class MerchantProfileMetadataDto {
    @ApiProperty({
      description: 'Unique identifier of the merchant',
      example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
      format: 'uuid',
    })
    @IsUUID()
    merchantId: string;

    @ApiProperty({
      description: 'Unique identifier of the merchant profile',
      example: '5f7c6f6a-3d2f-4b65-9e8e-abcdef987654',
    })
    @IsString()
    profileId: string;

    @ApiProperty({
      description: 'Name of the merchant profile',
      example: 'Coffee Shop Premium',
    })
    @IsString()
    name: string;

    @ApiPropertyOptional({
      description: 'Name of the merchant profile in Arabic',
      example: 'مقهى بريميوم',
    })
    @IsOptional()
    @IsString()
    nameAr?: string;

    @ApiPropertyOptional({
      description: 'Maximum offer value allowed',
      example: 500,
    })
    @IsOptional()
    @IsInt()
    maxOfferValue?: number;

    @ApiPropertyOptional({
      description: 'Status of the merchant profile',
      enum: MerchantProfileStatusEnum,
      enumName: 'MerchantProfileStatusEnum',
      example: MerchantProfileStatusEnum.ACTIVE,
    })
    @IsOptional()
    @IsEnum(MerchantProfileStatusEnum)
    status?: MerchantProfileStatusEnum;

    @ApiPropertyOptional({
      description: 'Profile image URL',
      example: 'https://example.com/image.png',
    })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({
      description: 'Profile description in English',
      example: 'A premium coffee shop in downtown.',
    })
    @IsOptional()
    @IsString()
    desc?: string;

    @ApiPropertyOptional({
      description: 'Profile description in Arabic',
      example: 'مقهى بريميوم في وسط المدينة',
    })
    @IsOptional()
    @IsString()
    descAr?: string;

    @ApiPropertyOptional({
      description: 'UUID of the user who last updated this profile',
      example: '6f7c6f6a-3d2f-4b65-9e8e-112233445566',
      format: 'uuid',
    })
    @IsOptional()
    @IsUUID()
    updatedBy?: string;

    @ApiProperty({
      description: 'List of filter IDs associated with this profile',
      type: [String],
      example: ['f1a2b3c4-d5e6-7f8g-9h0i-123456abcdef'],
    })

    @IsArray()
      filterIds: string[];

    @ApiProperty({
      description: 'List of filter IDs excluded from this profile',
      type: [String],
      example: ['a1b2c3d4-e5f6-7g8h-9i0j-abcdef123456'],
    })
      @IsArray()
      excludedFilterIds: string[];

    @ApiPropertyOptional({
      description: 'Name of the sales person responsible for this profile',
      example: 'John Doe',
    })
     @IsOptional()
      @IsString()
      salesPerson?: string;

    @IsBoolean()
    @IsOptional()
    isShariah: boolean;
  }
  