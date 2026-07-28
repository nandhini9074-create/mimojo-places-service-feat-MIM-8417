import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString
  } from 'class-validator';

export class GooglePlacesDto {
    @ApiProperty({
      description: 'Unique identifier of the place returned by Google Places API.',
      example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    })
    @IsString()
    @IsNotEmpty()
    placeId: string;

    @ApiProperty({
      description: 'The search phrase or keyword used to query Google Places.',
      example: 'coffee shop near Dubai Mall',
    })
    @IsString()
    @IsNotEmpty()
    searchPhrase: string;
}