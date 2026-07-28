import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateGroupDto {
  @ApiProperty({
    description: 'Name of the group in English',
    example: 'Premium Merchants',
  })
  @IsNotEmptyString()
  name: string;

  @ApiPropertyOptional({
    description: 'Name of the group in Arabic',
    example: 'التجار المميزون',
  })
  @IsString()
  @IsOptional()
  nameAr: string;

  @ApiPropertyOptional({
    description: 'List of merchant IDs to detach from the group',
    example: ['merchant-123', 'merchant-456'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  detachMerchantIds: string[];

  @ApiPropertyOptional({
    description: 'List of merchant IDs to attach to the group',
    example: ['merchant-789', 'merchant-101'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  attachMerchantIds: string[];

  @ApiPropertyOptional({
    description: 'Unique identifier of the group (required for update)',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  id: string;
}
