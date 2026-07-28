import { DistanceRequestDto } from "src/distance/dtos/distance-req-dto";
import { DistanceService } from "../distance.service";

import { getDistanceBetweenTwoPoints } from "calculate-distance-between-coordinates";

jest.mock("calculate-distance-between-coordinates", () => ({
    getDistanceBetweenTwoPoints: jest.fn()
}));

describe('DistanceService', () => {
    let service: DistanceService;

    beforeEach(() => {
        service = new DistanceService();
    });

    describe('calculateDistances', () => {
        it('should calculate distances correctly', () => {
            const distanceReq: DistanceRequestDto = {
                source: { lat: 10, lon: 20 },
                destinations: [
                    { lat: 15, lon: 25 },
                    { lat: 30, lon: 40 }
                ]
            };

            (getDistanceBetweenTwoPoints as jest.Mock)
                .mockImplementation((source, destination, unit) => {
                    if (destination.lat === 15 && destination.lon === 25) return 100;
                    if (destination.lat === 30 && destination.lon === 40) return 200;
                    return 0;
                });

            const result = service.calculateDistances(distanceReq);

            expect(result).toEqual({
                source: { lat: 10, lon: 20 },
                destinations: [
                    { coordinate: { lat: 15, lon: 25 }, distanceInKm: "100.00" },
                    { coordinate: { lat: 30, lon: 40 }, distanceInKm: "200.00" }
                ]
            });

            expect(getDistanceBetweenTwoPoints).toHaveBeenCalledTimes(2);
        });
    });

    describe('calculateDistance', () => {
        it('should return correct distance object when distance is defined', () => {
            const result = service.calculateDistance(10, 20, 30, 40, 5000);

            expect(result).toEqual({
                source: { lat: 10, lng: 20 },
                coordinate: { lat: 30, lng: 40 },
                distanceInKm: "5.00"
            });
        });

        it('should return null for distance when undefined', () => {
            const result = service.calculateDistance(10, 20, 30, 40, undefined);

            expect(result).toEqual({
                source: { lat: 10, lng: 20 },
                coordinate: { lat: 30, lng: 40 },
                distanceInKm: null
            });
        });
    });
});
