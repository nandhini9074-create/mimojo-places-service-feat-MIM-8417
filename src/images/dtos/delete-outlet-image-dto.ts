import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID
} from 'class-validator';

export class DeleteOutletImageDto {
  
  @ApiProperty({
    description: 'Unique identifier of the outlet photo',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid'
  })
  @IsNotEmpty()
  @IsUUID()
  outletPhotoId: string;
}