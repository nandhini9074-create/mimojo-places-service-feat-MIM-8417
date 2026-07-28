import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadOutletImageFilesDto {
  @ApiPropertyOptional({
    type: 'string',
    maxLength: 200,
    description: 'Optional outlet ID',
  })
  outletId?: string;

  @ApiPropertyOptional({
    type: 'boolean',
    description: 'Whether to set the image as the hero image',
  })
  setAsHeroImage?: boolean;
}
