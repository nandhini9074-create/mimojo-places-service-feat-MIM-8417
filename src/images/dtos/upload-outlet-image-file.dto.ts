import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadOutletImageFileDto {
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

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional outlet image files',
  })
  image?: Express.Multer.File;
}
