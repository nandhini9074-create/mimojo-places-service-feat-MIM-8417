import { ApiProperty } from "@nestjs/swagger";
import { Coordinate } from "calculate-distance-between-coordinates";

export class DistanceRequestDto {
    @ApiProperty({
        description: 'Source coordinate with latitude and longitude',
        type: Object,
        example: { lat: 25.2048, lon: 55.2708 },
    })
    source: Coordinate;

    @ApiProperty({
        description: 'Array of destination coordinates',
        type: [Object],
        example: [
        { lat: 25.276987, lon: 55.296249 },
        { lat: 25.197197, lon: 55.274376 },
        ],
    })
    destinations: Coordinate[];
}
