import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { GooglePlacesDto } from 'src/google-places/dtos/google-places-dto';
import { GooglePlacesService } from './services/google-places.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller({ version: '1', path: 'google-places' })
export class GooglePlacesController {
  constructor(private readonly googlePlacesService: GooglePlacesService) {}

  @HttpCode(HttpStatus.OK)
  @Post('get-place-details')
  @ApiEndpoint({
    summary: 'Get Google Place details',
    description: 'Fetch details of a Google Place by placeId and optional search phrase.',
    bodyType: GooglePlacesDto,
  })
  async GetPlaceDetails(@Body() request: GooglePlacesDto): Promise<unknown> {
    return await this.googlePlacesService.getPlaces(request.placeId, request.searchPhrase);
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-places-text-search/:query')
  @ApiEndpoint({
    summary: 'Get Google Places by text search',
    description: 'Fetch Google Places based on a text search query.',
    pathParams: [
      {
        name: 'query',
        description: 'Text phrase for Google Places search',
        type: 'string',
        example: 'coffee shop near Dubai Mall',
      },
    ],
  })
  async GetPlacesByTextSearch(@Param('query') phrase: string): Promise<unknown> {
    return await this.googlePlacesService.getPlacesFormatted(phrase);
  }

  @HttpCode(HttpStatus.OK)
  @Get('get-place-actual-url/:query')
  @ApiEndpoint({
    summary: 'Get actual photo URL of a Google Place',
    description: 'Fetch the actual photo URL of a Google Place by reference ID.',
    pathParams: [
      {
        name: 'query',
        description: 'Reference ID of the Google Place',
        type: 'string',
        example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      },
    ],
  })
  async GetPlacesActualUrl(@Param('query') reference: string, @Res() res: Response): Promise<void> {
    const imageStream: { data: NodeJS.ReadableStream } = await this.googlePlacesService.getPlacesActualPhotoUrl(reference);
    imageStream.data.pipe(res);
  }
}
