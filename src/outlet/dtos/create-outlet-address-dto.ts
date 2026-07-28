import {
  IsNumber,
  IsString,
  IsUrl,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOutletAddressDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'Google Place ID' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  googlePlaceId: string;

  @ApiPropertyOptional({ maxLength: 200, description: 'Formatted address in English' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  formattedAddress: string;

  @ApiPropertyOptional({ maxLength: 200, description: 'Formatted address in Arabic' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  formattedAddressAr: string;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Google Maps URL' })
  @MaxLength(2000)
  @IsOptional()
  @IsUrl()
  mapUrl: string;

  @ApiPropertyOptional({ type: Number, description: 'Latitude of the outlet' })
  @IsNumber()
  @IsOptional()
  latitude: number;

  @ApiPropertyOptional({ type: Number, description: 'Longitude of the outlet' })
  @IsNumber()
  @IsOptional()
  longitude: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'City ID' })
  @IsUUID()
  @IsOptional()
  cityId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Neighbourhood ID' })
  @IsUUID()
  @IsOptional()
  neighbourhoodId: string;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Location description in English' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  location: string;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Location description in Arabic' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  locationAr: string;
}
