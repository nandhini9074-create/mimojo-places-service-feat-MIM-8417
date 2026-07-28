import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsUUID,
  } from 'class-validator';

export class MerchantStatusUpdatedDto {
    @ApiProperty({
      description: 'Unique identifier of the merchant',
      format: 'uuid',
      example: 'c9b1d6e8-3f62-4e2c-b2c6-12f9b6d8a5d2',
    })
    @IsUUID()
    @IsNotEmpty()
    merchantId: string;

    @ApiPropertyOptional({
      description: 'Status of the merchant in the CLO system',
      example: true,
    })
    @IsBoolean()
    @IsOptional()
    cloMerchantStatus?: boolean;

    @ApiPropertyOptional({
      description: 'Status of the merchant in the Circle system',
      example: true,
    })
    @IsBoolean()
    @IsOptional()
    circleMerchantStatus?: boolean;
}