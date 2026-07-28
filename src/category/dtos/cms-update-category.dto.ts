import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, ValidateIf, ValidateNested } from 'class-validator';
import { IsNotEmptyString } from 'src/common/decorators/IsNotEmptyString';
import { SubCategoryEnum } from 'src/outlet/enums/sub-category-enum';

enum CategoryActions {
  UPDATE = 'UPDATE',
  CREATE = 'CREATE',
  DELETE = 'DELETE'
}

export class SubCategoryDTO {
  @ApiPropertyOptional({
    description: 'Type of the subcategory (required when action is CREATE)',
    enum: SubCategoryEnum,
    enumName: 'SubCategoryEnum'
  })
  @ValidateIf((object: SubCategoryDTO) => {
    return object.action === CategoryActions.CREATE;
  })
  @IsEnum(SubCategoryEnum)
  type?: SubCategoryEnum

  @ApiPropertyOptional({
    description: 'Unique identifier of the subcategory (required for update/delete)',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'Name of the subcategory in English',
    example: 'Beverages',
  })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Name of the subcategory in Arabic',
    example: 'المشروبات',
  })
  @IsOptional()
  nameAr?: string;

  @ApiProperty({
    description: 'Action to perform on the subcategory (CREATE, UPDATE, DELETE)',
    enum: CategoryActions,
    enumName: 'CategoryActions'
  })
  @IsEnum(CategoryActions)
  action: CategoryActions;
}

export class FilterDTO {
  @ApiPropertyOptional({
    description: 'Unique identifier of the filter',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Subcategory details for this filter',
    type: SubCategoryDTO,
  })
  @ValidateNested()
  @Type(() => SubCategoryDTO)
  subCategory: SubCategoryDTO;
}

export class CmsUpdateCategoryDto {
  @ApiProperty({
    description: 'Category name in English',
    example: 'Food & Beverages',
  })
  @IsNotEmptyString()
  declare name;

  @ApiPropertyOptional({
    description: 'Category name in Arabic',
    example: 'المأكولات والمشروبات',
  })
  @IsOptional()
  @IsString()
  declare nameAr: string;

  @ApiProperty({
    description: 'Array of filters with subcategory details',
    type: [FilterDTO],
  })
  @ValidateNested({ each: true })
  @Type(() => FilterDTO)
  filters: FilterDTO[];
}
