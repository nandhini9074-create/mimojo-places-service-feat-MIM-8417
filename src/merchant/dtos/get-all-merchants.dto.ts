import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { MerchantStatusEnum } from '../enums/merchant-status.enum';
import { ProductEnum } from '../enums/merchant-listing-page.enum';
import { Transform } from 'class-transformer';

export class GetAllMerchantsDto {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  declare salesOwners?: string[];

  @IsOptional()
  @IsArray()
  declare categoriesIds?: string[];

  @IsOptional()
  @IsEnum(MerchantStatusEnum)
  declare merchantStatus?: MerchantStatusEnum;

  @IsOptional()
  @IsString()
  declare search?: string;

  @IsOptional()
  @IsString()
  declare country?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ProductEnum, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  declare product?: ProductEnum[];
}
