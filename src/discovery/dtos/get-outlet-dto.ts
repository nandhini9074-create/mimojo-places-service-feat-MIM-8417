import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate
} from 'class-validator';
import { OutletSortEnum } from '../enum/outlet-sort-enum';
import { Type } from 'class-transformer';
import { SanitizeCoordinate } from 'src/helpers/sanitize-coordinates.helper';
import { LocationCoordinate } from './location-coordinate-dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetOutletRequestDto {
  @ApiProperty({
    description: 'Page index for pagination',
    example: 1,
    format: 'int32',
  })
  @IsNumber()
  @IsNotEmpty()
  pageIndex: number;

  @ApiProperty({
    description: 'Number of items per page for pagination',
    example: 20,
    format: 'int32',
  })
  @IsNumber()
  @IsNotEmpty()
  pageSize: number;

  @ApiPropertyOptional({
    type: LocationCoordinate
  })
  @IsOptional()
  @Type(() => LocationCoordinate)
  @Validate(SanitizeCoordinate)
  sourceCoordinate: LocationCoordinate;

  @ApiPropertyOptional({
    description: 'Search string to filter outlets by name',
    example: 'Starbucks',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search: string;

  @ApiPropertyOptional({
    description: 'Sort outlets by this field',
    enum: OutletSortEnum,
    enumName: 'OutletSortEnum'
  })
  @IsOptional()
  @IsEnum(OutletSortEnum)
  sortBy: OutletSortEnum;

  @ApiPropertyOptional({
    description: 'Filter only favorite outlets',
    example: true,
    format: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  onlyFavorites: boolean;

  @ApiPropertyOptional({
    description: 'Array of required filter IDs',
    type: [String],
    example: ['filter-1', 'filter-2'],
  })
  @IsOptional()
  @IsArray()
  requiredFilters: string[];

  @ApiPropertyOptional({
    description: 'Array of non-required filter IDs',
    type: [String],
    example: ['filter-3', 'filter-4'],
  })
  @IsOptional()
  @IsArray()
  nonRequiredFilters: string[];

  @ApiPropertyOptional({
    description: 'City UUID to filter outlets',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  cityId: string;

  @ApiPropertyOptional({
    description: 'Array of neighbourhood IDs to filter outlets',
    type: [String],
    example: ['neighbourhood-1', 'neighbourhood-2'],
  })
  @IsOptional()
  @IsArray()
  neighbourhoods: string[];

  @ApiPropertyOptional({
    description: 'Category UUID to filter outlets',
    example: '5f6d6f6a-3d2f-4b65-9e8e-abcdef123456',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Array of outlet UUIDs to filter',
    type: [String],
    example: ['outlet-1', 'outlet-2'],
  })
  @IsOptional()
  @IsArray()
  outletIds: string[];

  @ApiPropertyOptional({
    description: 'Merchant UUID to filter outlets',
    example: '6f9c6f6a-3d2f-4b65-9e8e-abcdef987654',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  merchantId: string;

  @ApiPropertyOptional({
    description: 'Tab number for frontend display (1 or 2)',
    example: 1,
    format: 'int32',
    minimum: 1,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2)
  tabNumber: number;

  @ApiPropertyOptional({
    description: 'Array of merchant UUIDs to filter outlets',
    type: [String],
    example: ['merchant-1', 'merchant-2'],
  })
  @IsOptional()
  @IsArray()
  merchantIds: string[];

  @IsOptional()
  @IsBoolean()
  shariahOnly: boolean;

  @IsOptional()
  @IsUUID()
  profileId: string;
}
