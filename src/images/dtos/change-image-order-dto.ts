import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PhotoOrderDataDto {
  @ApiProperty({
    description: 'Unique identifier of the outlet photo',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
  })
  @IsString()
  outletPhotoId: string;

  @ApiProperty({
    description: 'Sort order for this photo',
    example: 1,
  })
  @IsNumber()
  sortOrder: number;
}

export class ChangeImageOrderDto {
  @ApiProperty({
    description: 'Array of photo order data objects',
    type: [PhotoOrderDataDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoOrderDataDto)
  orderData: PhotoOrderDataDto[];
}
