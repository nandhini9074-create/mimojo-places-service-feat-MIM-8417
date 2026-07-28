import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNumber,
    IsOptional,
  } from 'class-validator';

export class GetCitiesDto {
    @ApiPropertyOptional({
      description: 'Latitude of the location to filter cities',
      example: 25.2048,
    })
    @IsNumber()
    @IsOptional()
    lat: number;

    @ApiPropertyOptional({
      description: 'Longitude of the location to filter cities',
      example: 55.2708,
    })
    @IsNumber()
    @IsOptional()
    lng: number;
}