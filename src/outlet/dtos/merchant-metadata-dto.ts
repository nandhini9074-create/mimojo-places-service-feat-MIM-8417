import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FilterDto } from 'src/filters/dtos/filter-dto';

export class MerchantMetadataUpdatedDto {
  @ApiProperty({
    description: 'Unique merchant identifier',
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID()
  @IsNotEmpty()
  merchantId: string;

  @ApiPropertyOptional({
    description: 'Merchant display name',
    example: 'Amazon',
  })
  @IsOptional()
  @IsString()
  merchantName: string;

  @ApiPropertyOptional({
    description: 'Merchant description',
    example: 'Leading global e-commerce platform',
  })
  @IsOptional()
  @IsString()
  desc: string;

  @ApiPropertyOptional({
    description: 'Logo URL of the merchant',
    example: 'https://cdn.example.com/logos/amazon.png',
    format: 'url',
  })
  @IsOptional()
  @IsUrl()
  merchantLogoUrl: string;

  @ApiPropertyOptional({
    description: 'Art descriptions related to merchant',
    type: [String],
    example: ['Modern', 'Minimalist'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artDesc: string[];

  @ApiPropertyOptional({
    description: 'Competitor descriptions',
    type: [String],
    example: ['Flipkart', 'eBay'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitorDesc: string[];

  @ApiPropertyOptional({
    description: 'Associated filters with merchant',
    type: [FilterDto],
    example: [
      { id: 'filter-id-1', name: 'Electronics' },
      { id: 'filter-id-2', name: 'Books' },
    ],
  })
  @IsOptional()
  @IsArray()
  filters: FilterDto[];
}
