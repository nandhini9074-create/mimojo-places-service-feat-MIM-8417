import { Type } from 'class-transformer';
import { IsJSON, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryDto } from 'src/category/dtos/category-dto';
import { SubCategoryDto } from 'src/sub-category/dtos/sub-category-dto';

export class FilterWithMerchantProfileFilterDto {
  @IsNotEmpty()
  @IsUUID()
  filterId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsNotEmpty()
  @IsUUID()
  subCategoryId: string;

  @IsOptional()
  @Type(() => CategoryDto)
  category: CategoryDto;

  @IsOptional()
  @Type(() => SubCategoryDto)
  subCategory: SubCategoryDto;

  @IsOptional()
  @IsJSON()
  MerchantProfileFilter: {
    included: boolean;
  };
}
