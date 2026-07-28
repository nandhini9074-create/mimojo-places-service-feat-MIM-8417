import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetOutletDetailsDto {
  @ApiProperty({
    description: 'Unique identifier of the outlet',
    example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  outletId: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate of the user location',
    example: 25.2048,
    format: 'float',
  })
  @IsNumber()
  @IsOptional()
  lat: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate of the user location',
    example: 55.2708,
    format: 'float',
  })
  @IsNumber()
  @IsOptional()
  lng: number;

  @IsOptional()
  @IsString()
  profileId: string;
  
  @IsOptional()
  @IsBoolean()
  shariahOnly: boolean;
}