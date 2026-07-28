import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GetOutletSortDirectionEnum, GetOutletSortEnum } from '../enums/outlet-sort-enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetOutletSortDto {
  @ApiPropertyOptional({
    description: 'Field to sort the outlets by',
    enum: GetOutletSortEnum,
    enumName: 'GetOutletSortEnum',
  })
  @IsOptional()
  @IsEnum(GetOutletSortEnum)
  sortBy: GetOutletSortEnum;

  @ApiPropertyOptional({
    description: 'Field to sort the outlets on',
    enum: GetOutletSortEnum,
    enumName: 'GetOutletSortEnum',
  })
  @IsOptional()
  @IsString()
  sortOn: string;

  @ApiPropertyOptional({
    description: 'Direction of sorting',
    enum: GetOutletSortDirectionEnum,
    enumName: 'GetOutletSortDirectionEnum',
  })
  @IsOptional()
  @IsEnum(GetOutletSortDirectionEnum)
  sortDirection: GetOutletSortDirectionEnum;
}
