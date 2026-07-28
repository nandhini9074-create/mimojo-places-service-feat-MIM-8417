import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryDto } from 'src/category/dtos/category-dto';
import { SubCategoryDto } from 'src/sub-category/dtos/sub-category-dto';

export class CustomFilterDto {
  @ApiProperty({
    description: 'Unique identifier of the custom filter',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Name of the custom filter',
    example: 'Coffee Shops',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Category ID associated with this filter',
    example: 101,
    format: 'int32',
  })
  @IsNotEmpty()
  @IsNumber()
  categoryId: number;

  @ApiProperty({
    description: 'Subcategory ID associated with this filter',
    example: 202,
    format: 'int32',
  })
  @IsNotEmpty()
  @IsNumber()
  subCategoryId: number;

  @ApiPropertyOptional({
    description: 'Category details associated with this filter',
    type: CategoryDto,
  })
  @IsOptional()
  @Type(() => CategoryDto)
  category: CategoryDto;

  @ApiPropertyOptional({
    description: 'Subcategory details associated with this filter',
    type: SubCategoryDto,
  })
  @IsOptional()
  @Type(() => SubCategoryDto)
  subCategory: SubCategoryDto;
}
