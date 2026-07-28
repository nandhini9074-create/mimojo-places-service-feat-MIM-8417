import { Injectable } from '@nestjs/common';
import { getDistanceBetweenTwoPoints } from 'calculate-distance-between-coordinates';
import { DistanceRequestDto } from '../dtos/distance-req-dto';
import { DistanceResponseDto } from '../dtos/distance-res-dto';

@Injectable()
export class DistanceService {
  calculateDistances(distanceReq: DistanceRequestDto): DistanceResponseDto {
    const calculatedDistances: DistanceResponseDto = {
      source: {
        lat: 0,
        lon: 0,
      },
      destinations: [],
    };
    calculatedDistances.source = { lat: distanceReq.source.lat, lon: distanceReq.source.lon };

    distanceReq.destinations.forEach(destination => {
      let distanceInKm = getDistanceBetweenTwoPoints(
        { lat: distanceReq.source.lat, lon: distanceReq.source.lon },
        { lat: destination.lat, lon: destination.lon },
        'km'
      );

      calculatedDistances.destinations.push({
        coordinate: {
          lat: destination.lat,
          lon: destination.lon,
        },
        distanceInKm: distanceInKm.toFixed(2),
      });
    });
    return calculatedDistances;
  }

  calculateDistance(
    sourceLat: number,
    sourceLng: number,
    destLat: number,
    destLng: number,
    distance: number
  ): { source: { lat: number; lng: number }; coordinate: { lat: number; lng: number }; distanceInKm: string | null } {
    const distanceInKm = distance == undefined ? null : (distance / 1000).toFixed(2);

    return {
      source: {
        lat: sourceLat,
        lng: sourceLng,
      },
      coordinate: {
        lat: destLat,
        lng: destLng,
      },
      distanceInKm: distanceInKm,
    };
  }
}
