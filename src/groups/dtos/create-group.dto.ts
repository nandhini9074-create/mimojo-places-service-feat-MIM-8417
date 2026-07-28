import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Group name in English',
    example: 'Premium Merchants',
  })
  @IsNotEmptyString()
  name: string;

  @ApiPropertyOptional({
    description: 'Group name in Arabic',
    example: 'التجار المميزون',
  })
  @IsString()
  @IsOptional()
  nameAr?: string;

  @ApiPropertyOptional({
    description: 'List of merchant IDs associated with the group',
    example: ['merchant-123', 'merchant-456'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  merchantIds?: string[];

  @ApiPropertyOptional({
    description: 'List of user IDs who can view this group',
    example: ['user-001', 'user-002'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  groupViewers?: string[];
}
