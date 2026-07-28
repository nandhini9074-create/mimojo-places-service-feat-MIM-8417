import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { DistanceRequestDto } from './dtos/distance-req-dto';
import { DistanceResponseDto } from './dtos/distance-res-dto';
import { DistanceService } from './services/distance.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller('distance')
export class DistanceController {
    constructor(private readonly distanceService: DistanceService) { }

    @Post('calculate-distances')
    @ApiEndpoint({
    summary: 'Calculate distances between coordinates',
    bodyType: DistanceRequestDto,
    responseType: DistanceResponseDto,
    exampleResponse: {
      source: {
        lat: 12.9716,
        lon: 77.5946
      },
      destinations: {
        coordinate: {
          lat: 28.7041,
          lon: 77.1025
        },
        distanceInKm: '1743.2'
      }
    },
  })
    calculateDistances(@Body(ValidationPipe) distanceReq: DistanceRequestDto): DistanceResponseDto {
        return this.distanceService.calculateDistances(distanceReq);
    }
}