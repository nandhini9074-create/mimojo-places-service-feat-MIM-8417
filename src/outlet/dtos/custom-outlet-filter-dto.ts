import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { CustomFilterDto } from 'src/filters/dtos/custom-filter-dto';

export class CustomOutletFiltersDto {
  @IsUUID()
  @IsOptional()
  id: string;

  @IsBoolean()
  @IsNotEmpty()
  isCustomized: boolean;

  @IsBoolean()
  @IsOptional()
  included: boolean;

  @IsOptional()
  @Type(() => CustomFilterDto)
  filter: CustomFilterDto;
}
