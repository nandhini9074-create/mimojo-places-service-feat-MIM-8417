import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { GetOutletSortDto } from './get-outlet-sort-dto';
import { Type } from "class-transformer";
import { OutletStatusEnum } from '../enums/outlet-status-enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetOutletDto {
    @ApiProperty({
      description: 'Page index for pagination',
      example: 1,
      format: 'int32',
    })
    @IsNumber()
    @IsNotEmpty()
    pageIndex: number;
  
    @ApiProperty({
      description: 'Number of items per page',
      example: 20,
      format: 'int32',
    })
    @IsNumber()
    @IsNotEmpty()
    pageSize: number;
  
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
      description: 'Sorting options for outlets',
      type: GetOutletSortDto,
    })
    @IsOptional()    
    @ValidateNested()
    @Type(() => GetOutletSortDto)
    sort: GetOutletSortDto;

    @ApiPropertyOptional({
      description: 'Filter outlets by status',
      enum: OutletStatusEnum,
      enumName: 'OutletStatusEnum'
    })
    @IsOptional()
    @IsEnum(OutletStatusEnum)
    status: OutletStatusEnum;

    @ApiPropertyOptional({
      description: 'Whether to return outlets for map view',
      example: false,
      format: 'boolean',
    })
  @IsOptional()
  isMap: boolean
  }