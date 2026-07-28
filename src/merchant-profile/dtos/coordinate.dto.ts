import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class CoordinateDto {
  @ApiPropertyOptional({
    description: 'Latitude of the coordinate',
    example: 12.9716,
  })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude of the coordinate',
    example: 77.5946,
  })
  @IsOptional()
  @IsNumber()
  lng?: number;
}
