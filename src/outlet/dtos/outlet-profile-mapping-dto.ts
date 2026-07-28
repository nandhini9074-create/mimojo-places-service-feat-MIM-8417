import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OutletProfileMappingDto {
  @ApiProperty({
    description: 'Unique identifier of the profile',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  profileId: string;

  @ApiProperty({
    description: 'Unique identifier of the outlet',
    format: 'uuid',
    example: 'e7d4e0da-3341-4d17-9e9b-0242ac120002',
  })
  @IsNotEmpty()
  @IsUUID()
  outletId: string;

  @ApiProperty({
    description: 'Unique identifier of the merchant',
    format: 'uuid',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsNotEmpty()
  @IsUUID()
  merchantId: string;

  @ApiPropertyOptional({
    description: 'Start date for mapping',
    type: String,
    format: 'date-time',
    example: '2025-08-28T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for mapping',
    type: String,
    format: 'date-time',
    example: '2025-09-28T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Whether this mapping is enabled',
    type: Boolean,
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  mapToProfile: boolean;
}
