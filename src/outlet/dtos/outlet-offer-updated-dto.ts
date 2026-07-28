import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class OutletOfferUpdatedDto {
  @ApiProperty({
    description: 'List of outlet IDs to update',
    example: ['outlet-id-1', 'outlet-id-2'],
  })
  @IsNotEmpty()
  @IsString({ each: true })
  outletIds: string[];

  @ApiPropertyOptional({
    description: 'Maximum offer amount',
    example: 1000,
  })
  @IsNumber()
  @IsOptional()
  maxOffer: number;

  @ApiPropertyOptional({
    description: 'Indicates if the outlet has a custom offer',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  hasCustomOffer: boolean;

  @IsNotEmpty()
  @IsString()
  profileId: string;
}

export class CloneOfferDto {
  existingOutletId: string;
  newOutletId: string;
  outletName: string;
  merchantId: string;
  userId: string;
  token: Record<string, string>;
}
