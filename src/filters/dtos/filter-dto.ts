import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsJSON, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryDto } from 'src/category/dtos/category-dto';
import { SubCategoryDto } from 'src/sub-category/dtos/sub-category-dto';

export class FilterDto {
  @ApiProperty({
    description: 'Unique identifier of the filter',
    format: 'uuid',
    example: 'c9b1d6e8-3f62-4e2c-b2c6-12f9b6d8a5d2',
  })
  @IsNotEmpty()
  @IsUUID()
  filterId: string;

  @ApiProperty({
    description: 'Name of the filter',
    example: 'Discounts',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Category ID associated with this filter',
    format: 'uuid',
    example: 'e2b1c6e8-4d62-4a2b-b2a6-32f9c6d8b7e2',
  })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Sub-category ID associated with this filter',
    format: 'uuid',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsNotEmpty()
  @IsUUID()
  subCategoryId: string;

  @ApiPropertyOptional({
    type: () => CategoryDto,
    description: 'Optional category details',
  })
  @IsOptional()
  @Type(() => CategoryDto)
  category: CategoryDto;

  @ApiPropertyOptional({
    type: () => SubCategoryDto,
    description: 'Optional sub-category details',
  })
  @IsOptional()
  @Type(() => SubCategoryDto)
  subCategory: SubCategoryDto;

  @IsOptional()
  @IsJSON()
  @ApiPropertyOptional({
    type: 'object',
    description: 'Merchant filter configuration',
    properties: {
      included: { type: 'boolean', example: true },
    },
    additionalProperties: false,
    example: {
      included: true,
    },
  })
  MerchantFilter: {
    included: boolean;
  };
}
