import { Type } from 'class-transformer';
import {
    IsArray,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    MaxLength,
    ArrayUnique,
    ValidateNested,
} from 'class-validator';
import { CoordinateDto } from './coordinate.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  
export class GetMerchantsDto {
    @ApiProperty({
        description: 'Page index for pagination',
        example: 1,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    pageIndex: number;

    @ApiProperty({
        description: 'Page size for pagination',
        example: 20,
        minimum: 1,
        maximum: 100,
    })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsNotEmpty()
    pageSize: number;

    @ApiPropertyOptional({
        description: 'Filter by category IDs',
        type: [String],
        example: ['9f7c6f6a-3d2f-4b65-9e8e-123456789abc', '5f7c6f6a-3d2f-4b65-9e8e-abcdef987654'],
        uniqueItems: true,
    })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    categoryIds?: string[];

    @ApiPropertyOptional({
        description: 'Filter by city UUID',
        example: '6f7c6f6a-3d2f-4b65-9e8e-abcdef123456',
        format: 'uuid',
    })
    @IsOptional()
    @IsUUID()
    cityId?: string;

    @ApiPropertyOptional({
        description: 'Search keyword for merchant name',
        example: 'Coffee Shop',
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    search?: string;

    @ApiPropertyOptional({
        description: 'Source coordinate to calculate distance',
        type: CoordinateDto,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CoordinateDto)
    sourceCoordinate?: CoordinateDto;
}
  