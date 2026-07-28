import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class LocationCoordinate {
    @ApiProperty({
      description: 'Latitude coordinate of the location',
      example: 25.2048,
      format: 'float',
    })
    @IsNotEmpty()
    @IsNumber()
    lat: number;

    @ApiProperty({
      description: 'Longitude coordinate of the location',
      example: 55.2708,
      format: 'float',
    })
    @IsNotEmpty()
    @IsNumber()
    lng: number;
  }