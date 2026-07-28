import { ApiProperty } from "@nestjs/swagger";
import { Coordinate } from "calculate-distance-between-coordinates";

export class DistanceResponseDto {
    @ApiProperty({
        description: 'Source coordinate',
        type: Object,
        example: { lat: 12.9716, lon: 77.5946 },
    })
    source: Coordinate;

    @ApiProperty({
        description: 'Array of destination coordinates with distance in km',
        type: [Object],
        example: [
        {
            coordinate: { lat: 28.7041, lon: 77.1025 },
            distanceInKm: '1743.2',
        },
        ],
    })
    destinations: { coordinate: Coordinate, distanceInKm: string }[];
}