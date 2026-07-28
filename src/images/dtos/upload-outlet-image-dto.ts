import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class UploadOutletImageDto {
  @ApiPropertyOptional({
    type: 'string',
    maxLength: 200,
    description: 'Optional outlet ID'
  })
  @IsNotEmpty()
  outletId: string;

  @ApiPropertyOptional({
    type: 'boolean',
    description: 'Whether to set the image as the hero image'
  })
  @IsOptional()
  setAsHeroImage: boolean;
}
