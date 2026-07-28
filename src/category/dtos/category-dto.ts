import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    IsUrl
  } from 'class-validator';
  
  export class CategoryDto {    
    @ApiProperty({
      description: 'Unique identifier of the category',
      example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
      format: 'uuid',
    })
    @IsNotEmpty()
    @IsUUID()
    id: string;

    @ApiPropertyOptional({
      description: 'Name of the category',
      example: 'Beverages',
    })
    @IsOptional()
    @IsString()
    name: string;

    @ApiPropertyOptional({
      description: 'Image URL of the category',
      example: 'https://example.com/category-image.jpg',
      format: 'url',
    })
    @IsOptional()
    @IsUrl()
    imageUrl: string;

    @ApiPropertyOptional({
      description: 'Indicates if the category is virtual',
      example: false,
    })
    @IsOptional()
    @IsBoolean()
    isVirtual: boolean;
  }
