import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { CustomFilterDto } from 'src/filters/dtos/custom-filter-dto';

export class OutletProfileFiltersDto {
  @ApiPropertyOptional({
    description: 'Unique identifier of the outlet profile filter (for updates)',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  id: string;

  @ApiProperty({
    description: 'Indicates whether this filter is customized',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isCustomized: boolean;

  @ApiPropertyOptional({
    description: 'Indicates whether this filter is included in the profile',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  included: boolean;

  @ApiPropertyOptional({
    description: 'Nested custom filter details',
    type: CustomFilterDto,
  })
  @IsOptional()
  @Type(() => CustomFilterDto)
  filter: CustomFilterDto;
}
