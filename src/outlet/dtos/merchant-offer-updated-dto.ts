import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsUUID,
  } from 'class-validator';

export class MerchantOfferUpdatedDto {
    @ApiProperty({
      description: 'Unique identifier of the merchant',
      format: 'uuid',
      example: 'c9b1d6e8-3f62-4e2c-b2c6-12f9b6d8a5d2',
    })
    @IsUUID()
    @IsNotEmpty()
    merchantId: string;

    @ApiProperty({
      description: 'Maximum offer amount',
      example: 1000,
    })
    @IsNumber()
    @IsNotEmpty()
    maxOffer:number;
}