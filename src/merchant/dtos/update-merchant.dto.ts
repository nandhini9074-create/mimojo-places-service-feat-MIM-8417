import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';

export class UpdateMerchantDto {
  @ApiProperty({ description: 'Merchant name', example: 'Acme Store', minLength: 1 })
  @IsNotEmptyString()
  name: string;

  @ApiPropertyOptional({ description: 'Merchant name in Arabic', example: 'متجر أكمي' })
  @IsOptional()
  nameAr: string;

  @ApiProperty({ description: 'Group ID the merchant belongs to', example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc' })
  @IsNotEmptyString()
  groupId: string;

  @ApiProperty({ description: 'Country of the merchant', example: 'UAE' })
  @IsNotEmptyString()
  country: string;

  @ApiProperty({ description: 'City of the merchant', example: 'Dubai' })
  @IsNotEmptyString()
  city: string;

  @ApiProperty({ description: 'List of active filter IDs', example: ['filter1', 'filter2'], type: [String] })
  @IsArray()
  filterIds: string[];

  @ApiProperty({ description: 'List of excluded filter IDs', example: ['filter3'], type: [String] })
  @IsArray()
  excludedFilterIds: string[];

  @ApiPropertyOptional({ description: 'Merchant image URL', example: 'https://example.com/image.png', format: 'url' })
  @IsUrl()
  @IsOptional()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Merchant description', example: 'Top electronics store' })
  @IsOptional()
  @IsString()
  desc: string;

  @ApiPropertyOptional({ description: 'Merchant description in Arabic', example: 'أفضل متجر للإلكترونيات' })
  @IsOptional()
  @IsString()
  descAr: string;

  @ApiPropertyOptional({ description: 'Indicates if the merchant is modified', example: true })
  @IsBoolean()
  @IsOptional()
  isModified: boolean;

  @ApiPropertyOptional({ description: 'Sales person responsible', example: 'Alice' })
  @IsOptional()
  @IsString()
  salesPerson: string;

  @ApiPropertyOptional({ description: 'Indicates if merchant belongs to a circle', example: false })
  @IsOptional()
  @IsBoolean()
  isCircle: boolean;

  @ApiPropertyOptional({ description: 'Additional descriptions for articles', example: ['New offer', 'Seasonal deal'], type: [String] })
  @IsArray()
  @IsOptional()
  artDesc?: string[];

  @ApiPropertyOptional({ description: 'Descriptions of competitors', example: ['Competitor1', 'Competitor2'], type: [String] })
  @IsArray()
  @IsOptional()
  competitorDesc?: string[];
}
