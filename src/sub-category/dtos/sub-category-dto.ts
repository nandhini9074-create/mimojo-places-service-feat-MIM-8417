import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { SubCategoryEnum } from '../../outlet/enums/sub-category-enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubCategoryDto {
  @ApiProperty({
    description: 'Unique identifier of the subcategory',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @ApiPropertyOptional({
    description: 'Name of the subcategory',
    example: 'Beverages',
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Type of the subcategory',
    enum: SubCategoryEnum,
    enumName: 'SubCategoryEnum',
  })
  @IsNotEmpty()
  @IsEnum(SubCategoryEnum)
  type: SubCategoryEnum;
}
