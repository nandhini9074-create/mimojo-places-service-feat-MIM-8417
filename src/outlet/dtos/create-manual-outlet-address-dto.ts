import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsUrl, IsOptional, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';

export class CreateManualOutletAddressDto {
  @ApiPropertyOptional({
    description: 'Google Place ID of the address',
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  googlePlaceId: string;

  @ApiPropertyOptional({
    description: 'Formatted address in English',
    example: '123 Main Street, Downtown',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  formattedAddress: string;

  @ApiPropertyOptional({
    description: 'Formatted address in Arabic',
    example: '١٢٣ الشارع الرئيسي، وسط المدينة',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  formattedAddressAr: string;

  @ApiPropertyOptional({
    description: 'Google Maps URL of the location',
    example: 'https://maps.google.com/?q=12.9716,77.5946',
    maxLength: 2000,
    format: 'url',
  })
  @MaxLength(2000)
  @IsOptional()
  @IsUrl()
  mapUrl: string;

  @ApiPropertyOptional({
    description: 'Latitude of the location',
    example: 12.9716,
  })
  @IsNumber()
  @IsOptional()
  latitude: number;

  @ApiPropertyOptional({
    description: 'Longitude of the location',
    example: 77.5946,
  })
  @IsNumber()
  @IsOptional()
  longitude: number;

  @ApiProperty({
    description: 'City UUID for the address',
    example: '6f9c6f6a-3d2f-4b65-9e8e-abcdef987654',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty({
    description: 'Neighbourhood UUID for the address',
    example: '5f7c6f6a-3d2f-4b65-9e8e-123456789abc',
    format: 'uuid',
  })
  @IsUUID('all', { message: 'Neighbourhood is required' })
  neighbourhoodId: string;

  @ApiProperty({
    description: 'Location name or description in English',
    example: 'Near Central Park',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({
    description: 'Location name or description in Arabic',
    example: 'بالقرب من سنترال بارك',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsNotEmpty()
  @IsOptional()
  locationAr: string;
}
