import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotBlank } from '../decorator/isNotBlank.validator';
import { IsUrlWithHttpsAndWww } from '../decorator/isUrlWithHttpsAndWww.validator';
import { NoNegative } from '../decorator/noNegative.validator';
import { CreateOutletAddressDto } from './create-outlet-address-dto';
import { CreateOutletTimingDto } from './create-outlet-timing-dto';
import { MidPidRelationDto } from './mid-pid-relation-dto';

export class CreateOutletDto {
  @ApiProperty({
    description: 'Unique identifier of the merchant',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  merchantId: string;

  @ApiPropertyOptional({
    description: 'Outlet name',
    example: 'Starbucks Coffee',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  @IsNotBlank()
  name: string;

  @ApiPropertyOptional({
    description: 'Outlet name in Arabic',
    example: 'ستاربكس',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  @ValidateIf((o, value) => value !== '')
  @IsNotBlank()
  nameAr: string;

  @ApiPropertyOptional({
    description: 'Average rating of the outlet',
    example: 4.5,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @NoNegative()
  rating: number;

  @ApiPropertyOptional({
    description: 'Price level of the outlet (0 = free, 1 = inexpensive, etc.)',
    example: 2,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @NoNegative()
  priceLevel: number;

  @ApiPropertyOptional({
    description: 'Website URL (must start with https://www)',
    example: 'https://www.example.com',
    maxLength: 2000,
  })
  @MaxLength(2000)
  @IsOptional()
  @ValidateIf((o, value) => value !== '')
  @IsUrlWithHttpsAndWww()
  website: string;

  @ApiPropertyOptional({
    description: 'Arabic website URL (must start with https://www)',
    example: 'https://www.example.com/ar',
    maxLength: 2000,
  })
  @MaxLength(2000)
  @IsOptional()
  @ValidateIf((o, value) => value !== '')
  @IsUrlWithHttpsAndWww()
  websiteAr: string;

  @ApiPropertyOptional({
    description: 'Formatted phone number of the outlet',
    example: '+971-50-1234567',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  formattedPhoneNumber: string;

  @ApiPropertyOptional({
    description: 'Business status of the outlet',
    example: 'OPERATIONAL',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  businessStatus: string;

  @ApiPropertyOptional({
    description: 'Total number of user ratings',
    example: 1200,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @NoNegative()
  userRatingsTotal: number;

  @ApiPropertyOptional({
    description: 'List of photo URLs',
    example: ['https://www.example.com/photo1.jpg', 'https://www.example.com/photo2.jpg'],
    maxItems: 50,
    maxLength: 2000,
    type: [String],
  })
  @MaxLength(2000, { each: true })
  @IsOptional()
  photos: string[];

  @ApiPropertyOptional({
    description: 'Manual merchant IDs (max length 15 each)',
    example: ['MID12345', 'MID67890'],
    type: [String],
    maxLength: 15,
  })
  @MaxLength(15, { each: true })
  @IsString({ each: true })
  @IsOptional()
  merchantIdsManual: string[];

  @ApiPropertyOptional({
    description: 'POS IDs (max length 15 each)',
    example: ['POS123', 'POS456'],
    type: [String],
    maxLength: 15,
  })
  @MaxLength(15, { each: true })
  @IsString({ each: true })
  @IsOptional()
  posIds: string[];

  @ApiPropertyOptional({
    description: 'Description of the outlet',
    example: 'A cozy café serving coffee, tea, and snacks.',
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({
    description: 'Menu URL (must start with https://www)',
    example: 'https://www.example.com/menu',
    maxLength: 2000,
  })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  menuUrl: string;

  @ApiPropertyOptional({
    description: 'Arabic menu URL (must start with https://www)',
    example: 'https://www.example.com/ar/menu',
    maxLength: 2000,
  })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  menuUrlAr: string;

  @ApiPropertyOptional({
    description: 'Booking URL (must start with https://www)',
    example: 'https://www.example.com/book',
    maxLength: 2000,
  })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  bookingUrl: string;

  @ApiPropertyOptional({
    description: 'Arabic booking URL (must start with https://www)',
    example: 'https://www.example.com/ar/book',
    maxLength: 2000,
  })
  @MaxLength(2000)
  @IsOptional()
  @IsUrlWithHttpsAndWww()
  bookingUrlAr: string;

  @ApiPropertyOptional({
    description: 'Outlet timing details',
    type: CreateOutletTimingDto,
  })
  @Type(() => CreateOutletTimingDto)
  @IsOptional()
  @ValidateNested({ each: true })
  outletTiming: CreateOutletTimingDto;

  @ApiPropertyOptional({
    description: 'Outlet address details',
    type: CreateOutletAddressDto,
  })
  @IsOptional()
  @Type(() => CreateOutletAddressDto)
  @ValidateNested({ each: true })
  outletAddress: CreateOutletAddressDto;

  @ApiPropertyOptional({
    description: 'Mapping between merchant ID and PID',
    type: [MidPidRelationDto],
  })
  @IsOptional()
  midPidRelation: MidPidRelationDto[];

  @ApiPropertyOptional({
    description: 'Flag to check if terminal verification is needed',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  checkTerminal: boolean;
}

export class CloneOutletDto {
  @IsNotEmpty()
  @IsUUID()
  outletId: string;
}
