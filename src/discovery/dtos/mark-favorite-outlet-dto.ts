import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsUUID
  } from 'class-validator';

export class MarkFavoriteOutletDto {
    @ApiProperty({
      description: 'Unique identifier of the outlet',
      example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
      format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    outletId: string;

    @ApiProperty({
      description: 'Flag indicating whether the outlet should be marked as favorite or not',
      example: true,
      format: 'boolean',
    })
    @IsBoolean()
    @IsNotEmpty()
    isFavorite: boolean;    
}